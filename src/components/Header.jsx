import { useState, useEffect } from 'react'
import GooseEmoji from './GooseEmoji'
import './Header.css'

function getSessionId() {
  let id = sessionStorage.getItem('goosecam_session')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('goosecam_session', id)
  }
  return id
}

export default function Header() {
  const [viewers, setViewers] = useState(null)

  useEffect(() => {
    const sessionId = getSessionId()

    function heartbeat() {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => { if (data.viewers != null) setViewers(data.viewers) })
        .catch(() => {})
    }

    heartbeat()
    const interval = setInterval(heartbeat, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="header">
      <GooseEmoji className="goose-emoji" />
      <h1>THE GOOSE CAM</h1>
      <div className="subtitle">Live from Jack's Shed!</div>
      <div className="live-badges">
        <div className="live-badge">
          <span className="live-dot"></span>
          LIVE
        </div>
        {viewers != null && (
          <div className="viewer-badge">
            {viewers} {viewers === 1 ? 'viewer' : 'viewers'}
          </div>
        )}
      </div>
    </header>
  )
}
