import { useState } from 'react'

const empty = {
  name: '',
  telegram: '',
  username: '',
  role: 'Project Guide',
  message: '',
}

export default function JoinTeamSection({ onSubmit }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const result = onSubmit(form)
    if (!result.ok) {
      setError(result.error)
      setSuccess('')
      return
    }
    setError('')
    setSuccess(
      'Request sent! An admin will review it and share login details if approved.',
    )
    setForm(empty)
  }

  return (
    <section id="join" className="status-section join-section" aria-labelledby="join-title">
      <div className="section-shell join-shell">
      <div className="section-head">
        <h2 id="join-title">Want to join the team?</h2>
        <p>
          Send a request to become a Project Guider admin. Existing admins will
          review and approve.
        </p>
      </div>

      <form className="modal-form join-form" onSubmit={handleSubmit}>
        <label>
          Your name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Aina"
          />
        </label>

        <label>
          Telegram username
          <input
            name="telegram"
            value={form.telegram}
            onChange={handleChange}
            placeholder="without @"
          />
        </label>

        <label>
          Preferred login username
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="e.g. aina"
          />
        </label>

        <label>
          Role / specialty
          <input
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="e.g. Web Developer Guide"
          />
        </label>

        <label>
          Why do you want to join?
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={3}
            placeholder="Short intro about your skills"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button type="submit" className="btn btn-primary">
          Request to join
        </button>
      </form>
      </div>
    </section>
  )
}
