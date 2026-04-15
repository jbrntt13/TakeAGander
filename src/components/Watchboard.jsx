import { useState, useEffect } from 'react'
import './Leaderboard.css'

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${totalSeconds}s`
}

export default function Watchboard({ refreshKey }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    function poll() {
      fetch('/api/watchboard')
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setEntries(data) })
        .catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 120_000) // 2 minutes
    return () => clearInterval(interval)
  }, [refreshKey])

  return (
    <div className="leaderboard">
      <h3>Top Goose Watchers</h3>
      {entries.length === 0 ? (
        <p className="leaderboard-empty">No one's watching yet. Log in and stare at the goose!</p>
      ) : (
        <ul className="leaderboard-list">
          {entries.map((entry, i) => (
            <li className="leaderboard-row" key={entry.name}>
              <span className="leaderboard-rank">#{i + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-honks">{formatTime(entry.watchtime)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
