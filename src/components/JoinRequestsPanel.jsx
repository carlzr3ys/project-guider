import { useState } from 'react'

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function JoinRequestsPanel({
  requests,
  onApprove,
  onReject,
}) {
  const pending = requests.filter((r) => r.status === 'pending')
  const [passwords, setPasswords] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleApprove(id) {
    const password = passwords[id] || ''
    const result = await onApprove(id, { password })
    if (!result.ok) {
      setError(result.error)
      setSuccess('')
      return
    }
    setError('')
    setSuccess(
      `Approved @${result.account.username}. Temporary password: ${result.account.password}`,
    )
    setPasswords((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  return (
    <div className="admin-block">
      <div className="admin-block-head">
        <h3>
          Join requests
          {pending.length > 0 && (
            <span className="nav-badge">{pending.length}</span>
          )}
        </h3>
      </div>
      <p className="profile-note">
        People who want to join the team. Approve to create their admin login.
      </p>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      {pending.length === 0 ? (
        <p className="empty-note">No pending join requests.</p>
      ) : (
        <ul className="notif-list">
          {pending.map((request) => (
            <li key={request.id} className="notif-item unread">
              <span className="new-tag">PENDING</span>
              <div className="notif-top">
                <strong>{request.name}</strong>
                <time dateTime={request.createdAt}>
                  {formatTime(request.createdAt)}
                </time>
              </div>
              <p>
                Wants username <strong>@{request.username}</strong> · Telegram{' '}
                <strong>@{request.telegram}</strong>
              </p>
              <p className="notif-meta">Role: {request.role}</p>
              {request.message && (
                <p className="notif-notes">{request.message}</p>
              )}

              <label className="inline-label">
                Set temporary password
                <input
                  type="text"
                  value={passwords[request.id] || ''}
                  onChange={(e) =>
                    setPasswords((prev) => ({
                      ...prev,
                      [request.id]: e.target.value,
                    }))
                  }
                  placeholder="min 6 characters"
                />
              </label>

              <div className="notif-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApprove(request.id)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onReject(request.id)}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
