import { useState, useEffect } from 'react'
import GooseEmoji from './GooseEmoji'
import './GooseStatus.css'

function timeAgo(timestamp) {
  const seconds = Math.round((Date.now() - timestamp) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const ADMIN_USERS = ['Jack']

export default function GooseStatus({ user }) {
  const [status, setStatus] = useState(null)
  const [forcing, setForcing] = useState(false)
  const [forceMsg, setForceMsg] = useState('')

  useEffect(() => {
    function poll() {
      fetch('/api/goose-status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.status) setStatus(data)
        })
        .catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 10_000)
    return () => clearInterval(interval)
  }, [])

  const isAdmin = ADMIN_USERS.includes(user)

  const handleForce = async () => {
    const pw = sessionStorage.getItem('goosecam_pw')
    if (!pw) {
      setForceMsg('Log in again to use this')
      return
    }
    setForcing(true)
    setForceMsg('')
    try {
      const res = await fetch('/api/goose-force', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pw }),
      })
      const data = await res.json()
      if (data.ok) {
        setForceMsg('Checking...')
        // Poll quickly to pick up the new status
        setTimeout(() => {
          fetch('/api/goose-status')
            .then((r) => r.json())
            .then((d) => { if (d && d.status) setStatus(d) })
            .catch(() => {})
          setForceMsg('')
        }, 6000)
      } else {
        setForceMsg(data.error || 'Failed')
      }
    } catch {
      setForceMsg('Failed to connect')
    } finally {
      setForcing(false)
    }
  }

  const label = 'Current Goose Status:'

  if (!status || status.status === 'starting') {
    return (
      <div className="goose-status">
        <div className="goose-status-label">{label}</div>
        <div className="goose-status-value">
          <GooseEmoji /> Warming up...
        </div>
      </div>
    )
  }

  if (status.status === 'offline') {
    return (
      <div className="goose-status goose-status--offline">
        <div className="goose-status-label">{label}</div>
        <div className="goose-status-value">Feed unavailable</div>
      </div>
    )
  }

  return (
    <div className="goose-status">
      <div className="goose-status-label">{label}</div>
      <div className="goose-status-value">{status.detail}</div>
      {status.timestamp && (
        <div className="goose-status-time">Updated {timeAgo(status.timestamp)}</div>
      )}
      {isAdmin && (
        <button
          className="goose-force-btn"
          onClick={handleForce}
          disabled={forcing}
        >
          {forcing ? 'Checking...' : forceMsg || 'Check now'}
        </button>
      )}
    </div>
  )
}
