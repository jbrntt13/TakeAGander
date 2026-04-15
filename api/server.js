import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OPENAI_KEY = process.env.OPENAI_API_KEY || ''

const DATA_FILE = '/data/honks.json'
const USERS_FILE = '/data/users.json'
const VISITORS_FILE = '/data/visitors.json'
const PORT = 3000

function readData() {
  if (!existsSync(DATA_FILE)) return { count: 0 }
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return { count: 0 }
  }
}

function writeData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data))
}

function readUsers() {
  if (!existsSync(USERS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function writeUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users))
}

function readVisitors() {
  if (!existsSync(VISITORS_FILE)) return []
  try {
    return JSON.parse(readFileSync(VISITORS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeVisitors(visitors) {
  writeFileSync(VISITORS_FILE, JSON.stringify(visitors))
}

function trackVisitor(req) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
  const visitors = readVisitors()
  if (!visitors.includes(ip)) {
    visitors.push(ip)
    writeVisitors(visitors)
  }
  return visitors.length
}

async function checkUsername(username) {
  if (!OPENAI_KEY) return { ok: true } // skip check if no key configured

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 50,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a username moderator for a fun goose livestream site. Check if the username is appropriate. Allow creative, silly, and goose-themed names. Block anything sexual, slurs, hate speech, hard drug references, or anything you wouldn\'t want a 13-year-old to see. Respond with ONLY valid JSON: {"ok": true} if allowed, or {"ok": false, "reason": "brief reason"} if not.',
          },
          {
            role: 'user',
            content: username,
          },
        ],
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    return JSON.parse(content)
  } catch {
    // If the API is down or fails, let the user through
    return { ok: true }
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { resolve({}) }
    })
  })
}

// Username renames: old name → new name (old name still works for login)
const RENAMES = {
  'Jiminee69420': 'Jiminee',
}

// One-time migration: apply username renames
;(() => {
  const users = readUsers()
  let changed = false
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    if (users[oldName] && !users[newName]) {
      users[newName] = { ...users[oldName], aliases: [oldName] }
      delete users[oldName]
      changed = true
      console.log(`Renamed user "${oldName}" → "${newName}"`)
    }
  }
  if (changed) writeUsers(users)
})()

// One-time migration: seed "The Internet" with previously untracked anonymous honks
;(() => {
  const data = readData()
  const users = readUsers()
  const trackedHonks = Object.values(users).reduce((sum, u) => sum + (u.honks || 0), 0)
  const untracked = (data.count || 0) - trackedHonks
  if (untracked > 0 && !(users['The Internet'] || {}).migrated) {
    users['The Internet'] = users['The Internet'] || { honks: 0 }
    users['The Internet'].honks = (users['The Internet'].honks || 0) + untracked
    users['The Internet'].migrated = true
    writeUsers(users)
    console.log(`Migrated ${untracked} anonymous honks to "The Internet"`)
  }
})()

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'GET' && req.url === '/api/honks') {
    const data = readData()
    res.end(JSON.stringify({ count: data.count || 0 }))

  } else if (req.method === 'POST' && req.url === '/api/honks') {
    const { username } = await parseBody(req)
    const data = readData()
    data.count = (data.count || 0) + 1
    writeData(data)

    // Track per-user honks, or "The Internet" for anonymous
    const trackAs = (username && RENAMES[username]) || username || 'The Internet'
    const users = readUsers()
    if (!users[trackAs]) {
      users[trackAs] = { honks: 0 }
    }
    users[trackAs].honks = (users[trackAs].honks || 0) + 1
    writeUsers(users)

    res.end(JSON.stringify({ count: data.count }))

  } else if (req.method === 'POST' && req.url === '/api/login') {
    const { username, password } = await parseBody(req)

    if (!username || username.length < 1 || username.length > 20) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Username must be 1-20 characters' }))
      return
    }

    const users = readUsers()

    // Check if this is a renamed alias (e.g. "Jiminee69420" → "Jiminee")
    const resolvedName = RENAMES[username] || username

    if (users[resolvedName]) {
      // Existing user — check password
      if (users[resolvedName].password !== password) {
        res.statusCode = 401
        res.end(JSON.stringify({ error: 'Wrong password' }))
        return
      }
      res.end(JSON.stringify({ username: resolvedName, honks: users[resolvedName].honks || 0 }))
    } else {
      // New user — check username before creating
      const check = await checkUsername(username)
      if (!check.ok) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: check.reason || 'Pick a different username' }))
        return
      }

      users[username] = { password: password || '', honks: 0 }
      writeUsers(users)
      res.end(JSON.stringify({ username, honks: 0, created: true }))
    }

  } else if (req.method === 'POST' && req.url === '/api/watchtime') {
    const { username, seconds } = await parseBody(req)
    if (!username || !seconds || seconds < 0 || seconds > 120) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'bad request' }))
      return
    }
    const users = readUsers()
    if (users[username]) {
      users[username].watchtime = (users[username].watchtime || 0) + Math.round(seconds)
      writeUsers(users)
      res.end(JSON.stringify({ watchtime: users[username].watchtime }))
    } else {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'user not found' }))
    }

  } else if (req.method === 'GET' && req.url === '/api/watchboard') {
    const users = readUsers()
    const watchboard = Object.entries(users)
      .filter(([, data]) => (data.watchtime || 0) > 0)
      .map(([name, data]) => ({ name, watchtime: data.watchtime || 0 }))
      .sort((a, b) => b.watchtime - a.watchtime)
      .slice(0, 10)
    res.end(JSON.stringify(watchboard))

  } else if (req.method === 'GET' && req.url === '/api/leaderboard') {
    const users = readUsers()
    const leaderboard = Object.entries(users)
      .map(([name, data]) => ({ name, honks: data.honks || 0 }))
      .sort((a, b) => b.honks - a.honks)
      .slice(0, 10)
    res.end(JSON.stringify(leaderboard))

  } else if (req.method === 'GET' && req.url === '/api/visitors') {
    const count = trackVisitor(req)
    res.end(JSON.stringify({ count }))

  } else {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`Honk API listening on port ${PORT}`)
})
