import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import { compressImageFile } from '../utils/image'

export default function ProfileEditor({ person, onSave }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    name: '',
    role: '',
    bio: '',
    telegram: '',
    notifyChatId: '',
    photoUrl: '',
  })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!person) return
    setForm({
      name: person.name || '',
      role: person.role || '',
      bio: person.bio || '',
      telegram: person.contact?.telegram || '',
      notifyChatId: person.notifyChatId || '',
      photoUrl: person.photoUrl || '',
    })
    setError('')
    setSaved(false)
  }, [person])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const photoUrl = await compressImageFile(file)
      setForm((prev) => ({ ...prev, photoUrl }))
      setSaved(false)
    } catch (err) {
      setError(err.message || 'Could not upload image.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removePhoto() {
    setForm((prev) => ({ ...prev, photoUrl: '' }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await onSave(form)
    if (!result.ok) {
      setError(result.error)
      setSaved(false)
      return
    }
    setError('')
    setSaved(true)
  }

  if (!person) return null

  const preview = {
    ...person,
    name: form.name || person.name,
    photoUrl: form.photoUrl,
    avatar: form.name
      ? form.name
          .trim()
          .split(/\s+/)
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : person.avatar,
  }

  return (
    <div className="admin-block profile-editor">
      <h3>Edit your profile</h3>
      <p className="profile-note">
        Only you can edit this profile. Changes show on the public status page.
      </p>

      <form className="modal-form profile-form" onSubmit={handleSubmit}>
        <div className="profile-photo-row">
          <Avatar person={preview} className="avatar avatar-lg" />
          <div className="profile-photo-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading...' : 'Upload photo'}
            </button>
            {form.photoUrl && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={removePhoto}
              >
                Remove photo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhoto}
            />
            <span className="profile-hint">JPG/PNG, auto-compressed</span>
          </div>
        </div>

        <label>
          Display name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            maxLength={40}
          />
        </label>

        <label>
          Title / role
          <input
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="e.g. Project Guide · Coding Mentor"
            maxLength={80}
          />
        </label>

        <label>
          Bio / status text
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={3}
            placeholder="Short bio shown on your public profile"
            maxLength={220}
          />
        </label>

        <label>
          Telegram username
          <input
            name="telegram"
            value={form.telegram}
            onChange={handleChange}
            placeholder="username without @ — used for booking DMs"
            maxLength={40}
          />
        </label>
        <p className="profile-hint">
          Booking alerts go to this username. Open{' '}
          <a
            href="https://t.me/projectguiderlogin_bot"
            target="_blank"
            rel="noreferrer"
          >
            @projectguiderlogin_bot
          </a>{' '}
          once and tap <strong>Start</strong> — Telegram blocks the bot until
          you do.
        </p>

        <label>
          Notify chat ID (optional backup)
          <input
            name="notifyChatId"
            value={form.notifyChatId}
            onChange={handleChange}
            placeholder="Only if username DM fails"
            inputMode="numeric"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {saved && !error && <p className="form-success">Profile saved.</p>}

        <button type="submit" className="btn btn-primary">
          Save profile
        </button>
      </form>
    </div>
  )
}
