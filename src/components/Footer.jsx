import { useState, useEffect } from 'react'
import './Footer.css'

export default function Footer() {
  const [visitors, setVisitors] = useState(null)

  useEffect(() => {
    fetch('/api/visitors')
      .then((res) => res.json())
      .then((data) => { if (data.count) setVisitors(data.count) })
      .catch(() => {})
  }, [])

  return (
    <footer className="footer">
      {visitors != null && (
        <p className="visitor-count">
          {visitors.toLocaleString()} {visitors === 1 ? 'person has' : 'people have'} taken a gander
        </p>
      )}
      <p>A very serious project &middot; Powered by whimsy and a WiFi camera</p>
    </footer>
  )
}
