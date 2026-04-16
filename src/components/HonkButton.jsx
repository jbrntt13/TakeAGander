import { useState, useCallback, useEffect } from 'react'
import GooseEmoji from './GooseEmoji'
import './HonkButton.css'

const honkTexts = ['HONK', 'HONK!', 'HÖÑK', 'H O N K']

export default function HonkButton({ user, onHonk }) {
  const [count, setCount] = useState(0)
  const [honking, setHonking] = useState(false)
  const [floats, setFloats] = useState([])

  useEffect(() => {
    fetch('/api/honks')
      .then((res) => res.json())
      .then((data) => setCount(data.count))
      .catch(() => {})
  }, [])

  const doHonk = useCallback(() => {
    const honkAudio = new Audio('/honk-sound.mp3')
    honkAudio.play().catch(() => {})
    setHonking(true)
    setTimeout(() => setHonking(false), 400)

    const id = Date.now()
    const float = {
      id,
      text: honkTexts[Math.floor(Math.random() * honkTexts.length)],
      left: (Math.random() * 60 + 20) + 'vw',
      top: (Math.random() * 30 + 40) + 'vh',
    }
    setFloats((prev) => [...prev, float])
    setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 1300)

    fetch('/api/honks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user || null }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count)
        onHonk?.()
      })
      .catch(() => setCount((c) => c + 1))
  }, [user, onHonk])

  return (
    <div className="honk-section">
      <div className="honk-counter">
        The internet has honked <strong>{count.toLocaleString()}</strong> times
      </div>
      <button
        className={`honk-btn${honking ? ' honking' : ''}`}
        onClick={doHonk}
      >
        <GooseEmoji /> HONK
      </button>
      {floats.map((f) => (
        <div
          key={f.id}
          className="honk-float"
          style={{ left: f.left, top: f.top }}
        >
          {f.text}
        </div>
      ))}
    </div>
  )
}
