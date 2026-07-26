import { useState } from 'react'
import { BRAND } from '../data'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await onLogin(username.trim(), password)
    if (!result.ok) {
      setError(result.error)
    }
  }

  return (
    <section className="login-section" aria-labelledby="login-title">
      <div className="login-card">
        <div className="section-head">
          <h2 id="login-title">Admin login</h2>
          <p>Log in to manage your status and view bookings.</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your username"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary login-submit">
            Login
          </button>
        </form>

        <p className="login-hint">{BRAND.fullName}</p>
      </div>
    </section>
  )
}
