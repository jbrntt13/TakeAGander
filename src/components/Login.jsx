import { useState } from 'react'
import './Login.css'

export default function Login({ user, onLogin, onLogout }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setHint('')
    await submit()
  }

  const handleSignup = async () => {
    if (!username.trim() || !password) {
      setHint('Enter a username and password to sign up')
      return
    }
    setHint('')
    await submit()
  }

  const submit = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
      } else {
        onLogin(data.username)
        setUsername('')
        setPassword('')
      }
    } catch {
      setError('Could not connect')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="login-bar">
        <div className="logged-in-info">
          Honking as <strong>{user}</strong>
        </div>
        <button className="logout-btn" onClick={onLogout}>Log out</button>
      </div>
    )
  }

  return (
    <div className="login-section">
      <form className="login-bar" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setHint('') }}
          maxLength={20}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setHint('') }}
        />
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? '...' : 'Log in'}
        </button>
        <button
          className="signup-btn"
          type="button"
          disabled={loading}
          onClick={handleSignup}
        >
          Sign up
        </button>
      </form>
      {error && <p className="login-error">{error}</p>}
      {hint && <p className="login-hint">{hint}</p>}
    </div>
  )
}
