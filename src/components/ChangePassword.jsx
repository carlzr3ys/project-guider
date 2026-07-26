import { useState } from 'react'

const empty = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function ChangePassword({ onChangePassword }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await onChangePassword(form)
    if (!result.ok) {
      setError(result.error)
      setSaved(false)
      return
    }
    setError('')
    setSaved(true)
    setForm(empty)
  }

  return (
    <div className="admin-block">
      <h3>Change password</h3>
      <p className="profile-note">Only you can change your own login password.</p>

      <form className="modal-form profile-form" onSubmit={handleSubmit}>
        <label>
          Current password
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
          />
        </label>

        <label>
          New password
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
        </label>

        <label>
          Confirm new password
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {saved && !error && <p className="form-success">Password updated.</p>}

        <button type="submit" className="btn btn-primary">
          Update password
        </button>
      </form>
    </div>
  )
}
