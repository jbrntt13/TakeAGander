import { useState, useCallback } from 'react'
import Header from './components/Header'
import Login from './components/Login'
import StreamViewer from './components/StreamViewer'
import InfoCards from './components/InfoCards'
import HonkButton from './components/HonkButton'
import Leaderboard from './components/Leaderboard'
import Watchboard from './components/Watchboard'
import WatchTracker from './components/WatchTracker'
import GooseStatus from './components/GooseStatus'
import GooseLog from './components/GooseLog'
import FactTicker from './components/FactTicker'
import Footer from './components/Footer'
import KofiButton from './components/KofiButton'

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('goosecam_user'))
  const [refreshKey, setRefreshKey] = useState(0)
  const [layout, setLayout] = useState(() => localStorage.getItem('goosecam_layout') || 'theater')

  const toggleLayout = useCallback(() => {
    setLayout((prev) => {
      const next = prev === 'theater' ? 'activity' : 'theater'
      localStorage.setItem('goosecam_layout', next)
      return next
    })
  }, [])

  const handleLogin = useCallback((username) => {
    setUser(username)
    localStorage.setItem('goosecam_user', username)
  }, [])

  const handleLogout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('goosecam_user')
  }, [])

  const handleHonk = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="container">
      <Header />
      <div className="layout-toggle">
        <button
          className={layout === 'theater' ? 'layout-btn layout-btn--active' : 'layout-btn'}
          onClick={() => { localStorage.setItem('goosecam_layout', 'theater'); setLayout('theater') }}
        >
          Theater
        </button>
        <button
          className={layout === 'activity' ? 'layout-btn layout-btn--active' : 'layout-btn'}
          onClick={() => { localStorage.setItem('goosecam_layout', 'activity'); setLayout('activity') }}
        >
          Activity
        </button>
      </div>
      <div className={layout === 'activity' ? 'stream-row' : 'stream-row stream-row--theater'}>
        {layout === 'activity' && <GooseLog />}
        <div className="stream-col">
          <StreamViewer />
          <GooseStatus user={user} />
        </div>
      </div>
      <InfoCards />
      <HonkButton user={user} onHonk={handleHonk} />
      <Login user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <div className="boards-row">
        <Leaderboard refreshKey={refreshKey} />
        <Watchboard refreshKey={refreshKey} />
      </div>
      <WatchTracker user={user} />
      <FactTicker />
      <KofiButton />
      <Footer />
    </div>
  )
}
