import { useState, useCallback } from 'react'
import Header from './components/Header'
import Login from './components/Login'
import StreamViewer from './components/StreamViewer'
import InfoCards from './components/InfoCards'
import HonkButton from './components/HonkButton'
import Leaderboard from './components/Leaderboard'
import Watchboard from './components/Watchboard'
import WatchTracker from './components/WatchTracker'
import FactTicker from './components/FactTicker'
import Footer from './components/Footer'

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('goosecam_user'))
  const [refreshKey, setRefreshKey] = useState(0)

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
      <StreamViewer />
      <InfoCards />
      <HonkButton user={user} onHonk={handleHonk} />
      <Login user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <div className="boards-row">
        <Leaderboard refreshKey={refreshKey} />
        <Watchboard refreshKey={refreshKey} />
      </div>
      <WatchTracker user={user} />
      <FactTicker />
      <Footer />
    </div>
  )
}
