import { execSync, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs'

const RTSP_URL = process.env.RTSP_URL || ''
const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
const STATUS_FILE = '/data/goose-status.json'
const LOG_FILE = '/data/goose-log.json'
const HISTORY_FILE = '/data/goose-history.jsonl'
const SCREENSHOT_DIR = '/data/goose-screenshots'
const FORCE_FILE = '/data/goose-force.json'
const MAX_LOG_ENTRIES = 8
const FRAME_DIR = '/tmp/goose-frames'
const POLL_INTERVAL = 3_000       // grab a frame every 3s
const DIFF_THRESHOLD_DAY = 10     // % pixel change to trigger AI call (6am-8pm)
const DIFF_THRESHOLD_NIGHT = 3.5  // % pixel change to trigger AI call (8pm-6am)
function getDiffThreshold() {
  const hour = new Date().getHours()
  return (hour >= 20 || hour < 6) ? DIFF_THRESHOLD_NIGHT : DIFF_THRESHOLD_DAY
}
const COOLDOWN_MS = 3_000         // min 3s between AI calls even if diff triggers
const OFFLINE_TIMEOUT = 15_000    // if ffmpeg fails this many ms, mark offline

// Ensure directories exist
execSync(`mkdir -p ${FRAME_DIR}`)
execSync(`mkdir -p ${SCREENSHOT_DIR}`)

let lastAiCall = 0
let lastStatus = readStatus()
let consecutiveFailures = 0

function readStatus() {
  if (!existsSync(STATUS_FILE)) return { status: 'starting up', detail: 'Goose AI is waking up...', timestamp: Date.now() }
  try {
    return JSON.parse(readFileSync(STATUS_FILE, 'utf8'))
  } catch {
    return { status: 'unknown', detail: '', timestamp: Date.now() }
  }
}

function writeStatus(status) {
  lastStatus = status
  writeFileSync(STATUS_FILE, JSON.stringify(status))
}

function readLog() {
  if (!existsSync(LOG_FILE)) return []
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeLog(log) {
  writeFileSync(LOG_FILE, JSON.stringify(log))
}

function logActivity(description, activity, framePath) {
  const now = Date.now()
  const log = readLog()

  // Close out the previous entry
  if (log.length > 0) {
    log[0].endedAt = now
  }

  // Save screenshot
  let screenshot = null
  if (framePath && existsSync(framePath)) {
    screenshot = `${now}.jpg`
    try {
      copyFileSync(framePath, `${SCREENSHOT_DIR}/${screenshot}`)
    } catch (err) {
      console.error('Failed to save screenshot:', err.message)
      screenshot = null
    }
  }

  // Add new entry at the front (recent activity log)
  log.unshift({ description, activity, startedAt: now, endedAt: null, screenshot })
  writeLog(log.slice(0, MAX_LOG_ENTRIES))

  // Append to permanent history
  const historyEntry = JSON.stringify({ description, activity, timestamp: now, screenshot })
  appendFileSync(HISTORY_FILE, historyEntry + '\n')
  console.log(`History logged: ${description} (screenshot: ${screenshot || 'none'})`)
}

function grabFrame(outPath) {
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-rtsp_transport', 'tcp',
      '-i', RTSP_URL,
      '-frames:v', '1',
      '-q:v', '2',
      outPath,
    ], { timeout: 10_000, stdio: 'pipe' })
    consecutiveFailures = 0
    return true
  } catch {
    consecutiveFailures++
    return false
  }
}

function diffFrames(pathA, pathB) {
  try {
    // Use ImageMagick compare — returns the number of different pixels
    const result = execFileSync('compare', [
      '-metric', 'RMSE',
      pathA, pathB,
      '/tmp/goose-diff.png',
    ], { timeout: 5_000, stdio: 'pipe', encoding: 'utf8' })
    // compare writes metric to stderr, but execFileSync might capture it
    return parseFloat(result) || 0
  } catch (err) {
    // compare exits non-zero when images differ — metric is in stderr
    const stderr = err.stderr?.toString() || ''
    // Format: "1234 (0.0567)" — the parenthesized value is normalized 0-1
    const match = stderr.match(/\(([\d.]+)\)/)
    if (match) return parseFloat(match[1]) * 100  // convert to percentage
    return 100 // assume big change if we can't parse
  }
}

function grabBurstFrames(count, intervalMs) {
  const paths = []
  for (let i = 0; i < count; i++) {
    const path = `${FRAME_DIR}/burst_${i}.jpg`
    const grabbed = grabFrame(path)
    if (grabbed) paths.push(path)
    if (i < count - 1) {
      // Blocking sleep between frames
      execFileSync('sleep', [`${intervalMs / 1000}`], { timeout: intervalMs + 1000 })
    }
  }
  return paths
}

async function analyzeFrames(framePaths, currentStatus) {
  if (!OPENAI_KEY) {
    console.log('No OpenAI key configured, skipping analysis')
    return null
  }

  const prevDescription = currentStatus?.detail || 'none'
  const prevActivity = currentStatus?.activity || 'unknown'

  const imageContent = framePaths.map((p, i) => {
    const imageData = readFileSync(p).toString('base64')
    return [
      { type: 'text', text: `Frame ${i + 1} of ${framePaths.length}:` },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}`, detail: 'low' } },
    ]
  }).flat()

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        temperature: 0.6,
        messages: [
          {
            role: 'system',
            content: `You are observing a live camera feed of a goose nesting on top of a shed. You will receive a burst of ${framePaths.length} frames captured 0.5 seconds apart — use all of them to judge the goose's action and movement. The current status is: "${prevDescription}" (activity: ${prevActivity}). Respond with ONLY valid JSON:
{
  "present": true/false,
  "activity": "nesting"|"standing"|"walking"|"eating"|"preening"|"honking"|"sleeping"|"other",
  "description": "max 5 words",
  "changed": true/false
}
RULES:
- Description must be 5 words or fewer.
- NEVER use the words: still, again, continues, continuing, remains, remaining, same, yet, ongoing. Each description must stand on its own as if it's the first thing anyone reads.
- Be plain and literal. Only describe what you can clearly see happening across the frames. Do NOT guess or infer actions you cannot confirm (e.g. do not say "rearranging feathers" or "preening" unless you clearly see the beak touching feathers).
- Describe the actual observed behavior — don't personify or narrate the goose's thoughts or feelings.
- Vary your phrasing.
- Set "changed" to true ONLY if the goose is doing something meaningfully different from the current status. Minor shifts or lighting changes are NOT a change.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is the goose doing right now? Here are the burst frames:' },
              ...imageContent,
            ],
          },
        ],
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    return JSON.parse(content)
  } catch (err) {
    console.error('OpenAI analysis failed:', err.message)
    return null
  }
}

async function tick() {
  const currentFrame = `${FRAME_DIR}/current.jpg`
  const previousFrame = `${FRAME_DIR}/previous.jpg`

  // Grab a frame
  const grabbed = grabFrame(currentFrame)

  if (!grabbed) {
    if (consecutiveFailures >= 3) {
      writeStatus({
        status: 'offline',
        present: false,
        activity: 'unknown',
        detail: 'Camera feed unavailable',
        timestamp: Date.now(),
      })
    }
    return
  }

  // If we don't have a previous frame, this is the first run — always analyze
  let diffPct = 100
  if (existsSync(previousFrame)) {
    diffPct = diffFrames(previousFrame, currentFrame)
  }

  console.log(`Frame diff: ${diffPct.toFixed(1)}%`)

  // Check for force-analyze flag
  let forced = false
  if (existsSync(FORCE_FILE)) {
    try {
      unlinkSync(FORCE_FILE)
      forced = true
      console.log('Force analyze triggered')
    } catch {}
  }

  const now = Date.now()
  const cooldownOk = (now - lastAiCall) >= COOLDOWN_MS

  const threshold = getDiffThreshold()
  if (forced || (diffPct >= threshold && cooldownOk)) {
    console.log(forced ? 'Force analyzing...' : 'Change detected, capturing burst...')

    // Capture a burst of 5 frames, 0.5s apart, for better action detection
    const burstPaths = grabBurstFrames(5, 500)
    if (burstPaths.length === 0) {
      console.log('Burst capture failed, no frames grabbed')
      return
    }
    console.log(`Burst captured: ${burstPaths.length} frames`)

    const result = await analyzeFrames(burstPaths, lastStatus)
    // Use the last burst frame as the screenshot (most recent)
    const screenshotFrame = burstPaths[burstPaths.length - 1]

    if (result) {
      lastAiCall = Date.now()
      if (forced || result.changed) {
        // Goose is doing something different — update everything including timestamp
        writeStatus({
          status: 'ok',
          present: result.present,
          activity: result.activity,
          detail: result.description,
          timestamp: now,
        })
        logActivity(result.description, result.activity, screenshotFrame)
        console.log(`Status changed: ${result.description}`)
      } else {
        // AI says not a meaningful change — but if the description actually
        // differs from what's in the log, update the log anyway
        const descriptionChanged = result.description !== lastStatus.detail
        if (descriptionChanged) {
          writeStatus({
            ...lastStatus,
            status: 'ok',
            present: result.present,
            activity: result.activity,
            detail: result.description,
            timestamp: now,
          })
          logActivity(result.description, result.activity, screenshotFrame)
          console.log(`Description changed: ${result.description}`)
        } else {
          writeStatus({
            ...lastStatus,
            status: 'ok',
            present: result.present,
            detail: result.description,
          })
          console.log(`Status unchanged: ${result.description}`)
        }
      }
    }
  }

  // Rotate frames — current becomes previous
  try {
    execSync(`cp ${currentFrame} ${previousFrame}`)
  } catch {}
}

// Main loop
console.log('Goose AI watcher starting...')
console.log(`RTSP URL: ${RTSP_URL ? 'configured' : 'MISSING'}`)
console.log(`OpenAI key: ${OPENAI_KEY ? 'configured' : 'MISSING'}`)

// Initial status
if (!existsSync(STATUS_FILE)) {
  writeStatus({ status: 'starting', present: null, activity: 'unknown', detail: 'Goose AI is warming up...', timestamp: Date.now() })
}

// Run immediately then on interval
tick().then(() => {
  setInterval(() => tick().catch(console.error), POLL_INTERVAL)
})
