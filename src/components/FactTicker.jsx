import { useState, useEffect } from 'react'
import './FactTicker.css'

const facts = [
  "Geese can fly at altitudes up to 29,000 feet. My shed goose has chosen not to.",
  "A group of geese on the ground is called a gaggle. A mom on a shed is called cute.",
  "Geese have teeth on their tongues. Sleep well.",
  "Geese mate for life. This goose has chosen the shed.",
  "Canada geese can remember people who have wronged them. Proceed with caution, its nationality is not yet known.",
  "Geese have been used as guard animals since ancient Rome. This one guards the shed.",
  "Baby geese can swim within 24 hours of hatching. I could do the same if pressured.",
  "A goose's honk can be heard from over a mile away. My neighbors know.",
  "Geese fly in V formation to save energy. Solo shed geese answer to no one.",
  "The plural of 'goose' is 'geese,' but there is only one shed goose. The Shed Goose.",
  "Geese have excellent eyesight and can see nearly 340 degrees around them. They see everything.",
  "Some geese have been known to live over 30 years. This could be a long stream.",
]

export default function FactTicker() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % facts.length)
        setVisible(true)
      }, 400)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fact-ticker">
      <div className="label">🧠 Goose Fact</div>
      <div className={`fact${visible ? '' : ' fact-hidden'}`}>
        {facts[index]}
      </div>
    </div>
  )
}
