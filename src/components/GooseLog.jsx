import { useState, useEffect } from 'react'
import './GooseLog.css'

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainMin = minutes % 60
  return remainMin > 0 ? `${hours}h ${remainMin}m` : `${hours}h`
}

export default function GooseLog() {
  const [log, setLog] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    function poll() {
      fetch('/api/goose-log')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setLog(data)
        })
        .catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 15_000)
    return () => clearInterval(interval)
  }, [])

  // Re-render every 30s so durations stay fresh for the current activity
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (log.length === 0) return null

  return (
    <div className="goose-log">
      <div className="goose-log-title">Activity Log</div>
      <ul className="goose-log-list">
        {log.map((entry, i) => {
          const end = entry.endedAt || Date.now()
          const duration = end - entry.startedAt
          const isCurrent = i === 0 && !entry.endedAt
          const isExpanded = expanded === entry.startedAt
          return (
            <li
              key={entry.startedAt}
              className={isCurrent ? 'goose-log-entry goose-log-entry--current' : 'goose-log-entry'}
              onClick={() => entry.screenshot && setExpanded(isExpanded ? null : entry.startedAt)}
            >
              <span>
                {isCurrent ? 'The Goose is ' : 'The Goose was '}
                <strong>{entry.description}</strong>
                {' for '}
                {formatDuration(duration)}
              </span>
              {entry.screenshot && (
                <span className="goose-log-camera" title="Click to see screenshot">
                  {isExpanded ? ' \u25B4' : ' \u25BE'}
                </span>
              )}
              {isExpanded && entry.screenshot && (
                <img
                  className="goose-log-screenshot"
                  src={`/api/goose-screenshot/${entry.screenshot}`}
                  alt={entry.description}
                  loading="lazy"
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
