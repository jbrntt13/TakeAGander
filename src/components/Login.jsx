import { useState } from 'react'
import './Login.css'

export default function Login({ user, onLogin, onLogout }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

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
    if (password !== confirmPassword) {
      setError('Passwords do not match')
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
        sessionStorage.setItem('goosecam_pw', password)
        setUsername('')
        setPassword('')
        setConfirmPassword('')
        setIsSignup(false)
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
          onChange={(e) => { setUsername(e.target.value); setHint(''); setError('') }}
          maxLength={20}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setHint(''); setError('') }}
        />
        {isSignup && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
          />
        )}
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? '...' : 'Log in'}
        </button>
        {isSignup ? (
          <button
            className="signup-btn"
            type="button"
            disabled={loading}
            onClick={handleSignup}
          >
            Sign up
          </button>
        ) : (
          <button
            className="signup-btn"
            type="button"
            onClick={() => setIsSignup(true)}
          >
            Sign up
          </button>
        )}
      </form>
      {isSignup && (
        <p className="login-disclaimer">
          I do absolutely nothing to protect this data. Please don't use your social security number as a password to track goose honks.
        </p>
      )}
      {error && <p className="login-error">{error}</p>}
      {hint && <p className="login-hint">{hint}</p>}
    </div>
  )
}
