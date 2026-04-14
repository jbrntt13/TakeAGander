import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const DATA_FILE = '/data/honks.json'
const PORT = 3000

function readCount() {
  if (!existsSync(DATA_FILE)) return 0
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8')).count || 0
  } catch {
    return 0
  }
}

function writeCount(count) {
  writeFileSync(DATA_FILE, JSON.stringify({ count }))
}

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'GET' && req.url === '/api/honks') {
    res.end(JSON.stringify({ count: readCount() }))
  } else if (req.method === 'POST' && req.url === '/api/honks') {
    const count = readCount() + 1
    writeCount(count)
    res.end(JSON.stringify({ count }))
  } else {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`Honk API listening on port ${PORT}`)
})
