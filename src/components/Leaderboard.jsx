import { useState, useEffect } from 'react'
import './Leaderboard.css'

export default function Leaderboard({ refreshKey }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    function poll() {
      fetch('/api/leaderboard')
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setEntries(data) })
        .catch(() => {})
    }
    poll()

    let timeout
    function schedule() {
      const delay = (Math.random() * 10 + 5) * 1000 // 5-15 seconds
      timeout = setTimeout(() => { poll(); schedule() }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [refreshKey])

  return (
    <div className="leaderboard">
      <h3>Top Honkers</h3>
      {entries.length === 0 ? (
        <p className="leaderboard-empty">No honks yet. Be the first!</p>
      ) : (
        <ul className="leaderboard-list">
          {entries.map((entry, i) => (
            <li className="leaderboard-row" key={entry.name}>
              <span className="leaderboard-rank">#{i + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-honks">
                {entry.honks.toLocaleString()} honk{entry.honks !== 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
