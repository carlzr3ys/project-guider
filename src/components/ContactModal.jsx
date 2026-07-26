import { statusLabel } from '../utils/status'

export default function ContactModal({ open, person, onClose }) {
  if (!open || !person) return null

  const label = statusLabel(person.status)
  const message = encodeURIComponent(
    `Hi ${person.name}, I saw your "${label}" status on Project Guider. Can you help guide my coding project?`,
  )
  const telegram = `${person.contact.telegramUrl}?text=${message}`

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="contact-title">Contact {person.name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="modal-lead">
          Status: <strong>{label}</strong>. Continue on Telegram at{' '}
          <strong>@{person.contact.telegram}</strong>.
        </p>

        <div className="contact-links">
          <a className="btn btn-primary" href={telegram} target="_blank" rel="noreferrer">
            Message @{person.contact.telegram}
          </a>
        </div>
      </div>
    </div>
  )
}
