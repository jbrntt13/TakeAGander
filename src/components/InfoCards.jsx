import GooseEmoji from './GooseEmoji'
import './InfoCards.css'

const cards = [
  {
    icon: 'goose',
    title: 'About The Goose',
    text: "This goose has claimed the top of a shed as their personal kingdom. We don't know where the dad is.",
  },
  {
    icon: '📍',
    title: 'Location',
    text: 'Atop a shed somewhere in Memphis, Tennessee. Elevation: roughly 5.5 feet. Attitude: immeasurable.',
  },
  {
    icon: '📡',
    title: 'The Tech',
    text: 'Tapo WiFi camera, running through go2rtc on a home server, tunneled to the internet via Cloudflare. All for one goose.',
  },
]

export default function InfoCards() {
  return (
    <div className="info-row">
      {cards.map((card) => (
        <div className="info-card" key={card.title}>
          <h3>{card.icon === 'goose' ? <GooseEmoji /> : card.icon} {card.title}</h3>
          <p>{card.text}</p>
        </div>
      ))}
    </div>
  )
}
