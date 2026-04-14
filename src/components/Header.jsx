import GooseEmoji from './GooseEmoji'
import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <GooseEmoji className="goose-emoji" />
      <h1>THE GOOSE CAM</h1>
      <div className="subtitle">Live from Jack's Shed!</div>
      <div className="live-badge">
        <span className="live-dot"></span>
        LIVE
      </div>
    </header>
  )
}
