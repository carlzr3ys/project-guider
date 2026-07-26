import { useState } from 'react'

const empty = {
  name: '',
  username: '',
  password: '',
  role: 'Project Guide',
  telegram: '',
  bio: '',
}

export default function AddAdminForm({ onAddAdmin }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await onAddAdmin(form)
    if (!result.ok) {
      setError(result.error)
      setSuccess('')
      return
    }
    setError('')
    setSuccess(
      `Admin @${result.account.username} added. Share the password with them securely.`,
    )
    setForm(empty)
  }

  return (
    <div className="admin-block">
      <h3>Add admin</h3>
      <p className="profile-note">
        Create a login for someone joining Project Guider. They will appear on the
        public status board.
      </p>

      <form className="modal-form profile-form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Aina"
          />
        </label>

        <label>
          Username
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="e.g. aina"
          />
        </label>

        <label>
          Temporary password
          <input
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
          />
        </label>

        <label>
          Title / role
          <input
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="Project Guide"
          />
        </label>

        <label>
          Telegram username
          <input
            name="telegram"
            value={form.telegram}
            onChange={handleChange}
            placeholder="without @ — used for booking DMs"
            required
          />
        </label>
        <p className="profile-note">
          New admin must open @projectguiderlogin_bot and tap Start once so the
          bot can DM them.
        </p>

        <label>
          Short bio
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={2}
            placeholder="Optional intro"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button type="submit" className="btn btn-primary">
          Create admin
        </button>
      </form>
    </div>
  )
}
