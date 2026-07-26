import { useEffect, useRef, useState } from 'react'
import { displayName } from '../auth/telegramAuth'
import { BRAND } from '../data'
import { isBookable, statusLabel } from '../utils/status'
import DatePicker from './DatePicker'
import SelectDropdown from './SelectDropdown'
import TelegramLoginButton from './TelegramLoginButton'

const empty = {
  project: '',
  date: '',
  notes: '',
}

export default function BookModal({
  open,
  freelancers,
  selected,
  telegramAuth,
  onClose,
  onSubmit,
  onToast,
}) {
  const availablePeople = freelancers.filter((f) => isBookable(f.status))
  const [form, setForm] = useState(empty)
  const [freelancerId, setFreelancerId] = useState('')
  const [error, setError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const wasOpenRef = useRef(false)

  const adminOptions = availablePeople.map((f) => ({
    value: f.id,
    label: `${f.name} — ${statusLabel(f.status)}`,
  }))

  const canBook = telegramAuth.isLoggedIn

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setForm(empty)
      setError('')
      const available = freelancers.filter((f) => isBookable(f.status))
      setFreelancerId(selected?.id || available[0]?.id || '')
    }
    wasOpenRef.current = open
  }, [open, selected, freelancers])

  useEffect(() => {
    if (!open || !freelancerId) return
    const stillAvailable = freelancers.some(
      (f) => f.id === freelancerId && isBookable(f.status),
    )
    if (!stillAvailable) {
      const next = freelancers.find((f) => isBookable(f.status))
      setFreelancerId(next?.id || '')
    }
  }, [open, freelancerId, freelancers])

  if (!open) return null

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleTelegramAuth(payload) {
    setAuthBusy(true)
    setError('')
    const result = await telegramAuth.login(payload)
    setAuthBusy(false)

    if (!result.ok) {
      setError(result.error || 'Telegram login failed.')
      onToast?.(result.error || 'Telegram login failed.')
      return
    }

    onToast?.(`Logged in as ${displayName(result.user)}`)
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!telegramAuth.isLoggedIn || !telegramAuth.user) {
      setError('Please log in with Telegram first.')
      return
    }
    if (!form.project.trim()) {
      setError('Please fill in your project.')
      return
    }
    if (!freelancerId) {
      setError('No available admin to book right now.')
      return
    }

    const person = freelancers.find((f) => f.id === freelancerId)
    const user = telegramAuth.user
    const telegram = user.username || String(user.id)
    const clientName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      (user.username ? `@${user.username}` : 'Telegram user')

    onSubmit({
      ...form,
      clientName,
      clientContact: user.username ? `@${user.username}` : `tg:${user.id}`,
      telegram,
      telegramId: user.id,
      telegramPhoto: user.photoUrl || '',
      joinedGroup: true,
      freelancerId,
      freelancerName: person?.name || 'Unknown',
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-title"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="book-title">Book a guide</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="telegram-gate">
          <strong>Telegram group members only</strong>
          <p>
            Log in with Telegram so we can verify you subscribed to{' '}
            <span>{BRAND.fullName}</span>.
          </p>

          {!canBook ? (
            <>
              <div className="telegram-login-wrap">
                {authBusy ? (
                  <p className="profile-note">Checking your group membership…</p>
                ) : (
                  <TelegramLoginButton
                    botUsername={telegramAuth.config.botUsername}
                    onAuth={handleTelegramAuth}
                    onError={setError}
                    onNeedConfig={() =>
                      setError(
                        'Set TELEGRAM_BOT_USERNAME / TELEGRAM_BOT_TOKEN in .env first.',
                      )
                    }
                  />
                )}
              </div>
              <p className="profile-hint">
                Not in the group yet?{' '}
                <a
                  href={telegramAuth.config.channelUrl || BRAND.telegramChannel}
                  target="_blank"
                  rel="noreferrer"
                >
                  Join Telegram group
                </a>{' '}
                first, then login.
              </p>
              <p className="profile-hint">
                If you see “Bot domain invalid”, admin must set BotFather{' '}
                <code>/setdomain</code> to <code>projectguider.airee.online</code>.
              </p>
            </>
          ) : (
            <div className="telegram-user-card">
              {telegramAuth.user.photoUrl ? (
                <img
                  src={telegramAuth.user.photoUrl}
                  alt=""
                  className="telegram-user-photo"
                />
              ) : (
                <div className="avatar avatar-sm">TG</div>
              )}
              <div>
                <strong>{telegramAuth.displayName}</strong>
                <p>Verified group member — ready to book.</p>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={() => telegramAuth.logout()}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {canBook && (
          <form className="modal-form" onSubmit={handleSubmit}>
            <SelectDropdown
              label="Admin"
              value={freelancerId}
              options={adminOptions}
              onChange={setFreelancerId}
              disabled={availablePeople.length === 0}
              placeholder="Select an admin"
            />

            <label>
              Project <span className="required-mark" aria-hidden="true">*</span>
              <input
                name="project"
                value={form.project}
                onChange={handleChange}
                placeholder="e.g. Python assignment / React project"
                required
              />
            </label>

            <DatePicker
              label="Preferred date"
              value={form.date}
              onChange={(date) => setForm((prev) => ({ ...prev, date }))}
            />

            <label>
              Extra notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Budget, deadline, ideas..."
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={availablePeople.length === 0}
              >
                Submit booking
              </button>
            </div>
          </form>
        )}

        {!canBook && error && <p className="form-error">{error}</p>}
      </div>
    </div>
  )
}
