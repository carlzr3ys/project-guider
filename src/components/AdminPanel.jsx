import { useMemo, useState } from 'react'
import { BRAND } from '../data'
import { ensureNotifyPermission } from '../utils/notify'
import { STATUS_OPTIONS, statusClass, statusLabel } from '../utils/status'
import AddAdminForm from './AddAdminForm'
import Avatar from './Avatar'
import ChangePassword from './ChangePassword'
import JoinRequestsPanel from './JoinRequestsPanel'
import ProfileEditor from './ProfileEditor'
import SelectDropdown from './SelectDropdown'

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

export default function AdminPanel({
  freelancerId,
  freelancers,
  myBookings,
  myUnread,
  joinRequests,
  pendingJoinCount,
  onSetStatus,
  onUpdateProfile,
  onChangePassword,
  onAddAdmin,
  onApproveJoin,
  onRejectJoin,
  onMarkRead,
  onMarkAllRead,
  onRemoveBooking,
  onLogout,
}) {
  const me = freelancers.find((f) => f.id === freelancerId)
  const [notifyStatus, setNotifyStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )

  const sorted = useMemo(
    () =>
      [...myBookings].sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1
        return b.createdAt.localeCompare(a.createdAt)
      }),
    [myBookings],
  )

  function replyHref(booking) {
    const handle = (booking.telegram || booking.clientContact || '')
      .trim()
      .replace(/^@/, '')
      .replace(/^tg:/, '')
    if (handle && !/^\d+$/.test(handle)) {
      return `https://t.me/${handle}`
    }
    if (booking.telegramId) {
      return `tg://user?id=${booking.telegramId}`
    }
    return BRAND.telegramChannel
  }

  async function enableAlerts() {
    const result = await ensureNotifyPermission()
    setNotifyStatus(result)
  }

  return (
    <section className="admin-section" aria-labelledby="admin-title">
      <div className="section-head admin-head">
        <div>
          <h2 id="admin-title">Admin panel</h2>
          <p>Hi {me?.name || 'Admin'} — manage profile, password, team, and bookings.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onLogout}>
          Logout
        </button>
      </div>

      {myUnread > 0 && (
        <div className="alert-banner" role="alert">
          <div>
            <strong>
              {myUnread} new booking{myUnread > 1 ? 's' : ''} for you!
            </strong>
            <p>Check the notifications below and reply to the client.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onMarkAllRead}>
            Mark all read
          </button>
        </div>
      )}

      {pendingJoinCount > 0 && (
        <div className="alert-banner join-alert" role="status">
          <div>
            <strong>
              {pendingJoinCount} join request{pendingJoinCount > 1 ? 's' : ''} pending
            </strong>
            <p>Review people who want to join Project Guider.</p>
          </div>
          <a className="btn btn-primary" href="#join-requests">
            Review
          </a>
        </div>
      )}

      <div className="notify-enable">
        <div>
          <strong>Phone / browser alerts</strong>
          <p>
            {notifyStatus === 'granted'
              ? 'Alerts are ON — you will get a popup when someone books you.'
              : 'Enable alerts so your phone/browser notifies you about new bookings.'}
          </p>
        </div>
        {notifyStatus !== 'granted' && notifyStatus !== 'unsupported' && (
          <button type="button" className="btn btn-primary" onClick={enableAlerts}>
            Enable alerts
          </button>
        )}
      </div>

      <div className="admin-stack">
        <ProfileEditor person={me} onSave={onUpdateProfile} />
        <ChangePassword onChangePassword={onChangePassword} />
        <AddAdminForm onAddAdmin={onAddAdmin} />
        <div id="join-requests">
          <JoinRequestsPanel
            requests={joinRequests}
            onApprove={onApproveJoin}
            onReject={onRejectJoin}
          />
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-block">
          <h3>Team status</h3>
          <p className="profile-note">
            You can only change your own status: Free, Not too busy, or Busy.
          </p>
          <ul className="admin-list">
            {freelancers.map((person) => {
              const chip = statusClass(person.status)
              const isMine = person.id === freelancerId
              return (
                <li
                  key={person.id}
                  className={`admin-person ${isMine ? 'is-mine' : ''}`}
                >
                  <div className="admin-person-main">
                    <Avatar person={person} className="avatar avatar-sm" />
                    <div>
                      <strong>
                        {person.name}
                        {isMine ? ' (you)' : ''}
                      </strong>
                      <span>{person.role}</span>
                    </div>
                  </div>
                  {isMine ? (
                    <SelectDropdown
                      className="status-dropdown"
                      tone={chip}
                      value={person.status}
                      options={STATUS_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      onChange={(status) => onSetStatus(person.id, status)}
                    />
                  ) : (
                    <span className={`status-chip ${chip}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {statusLabel(person.status)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="admin-block" id="my-notifications">
          <div className="admin-block-head">
            <h3>
              Your bookings
              {myUnread > 0 && <span className="nav-badge">{myUnread}</span>}
            </h3>
            {sorted.length > 0 && (
              <button type="button" className="text-btn" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {sorted.length === 0 ? (
            <p className="empty-note">No one has booked you yet.</p>
          ) : (
            <ul className="notif-list">
              {sorted.map((booking) => (
                <li
                  key={booking.id}
                  className={`notif-item ${booking.read ? '' : 'unread'}`}
                >
                  {!booking.read && <span className="new-tag">NEW</span>}
                  <div className="notif-top">
                    <strong>{booking.clientName}</strong>
                    <time dateTime={booking.createdAt}>
                      {formatTime(booking.createdAt)}
                    </time>
                  </div>
                  <p>
                    Booked you for <strong>{booking.project}</strong>
                  </p>
                  <p className="notif-meta">
                    Telegram: {booking.clientContact}
                    {booking.joinedGroup ? ' · Group member confirmed' : ''}
                    {booking.date ? ` · Date: ${booking.date}` : ''}
                  </p>
                  {booking.notes && <p className="notif-notes">{booking.notes}</p>}
                  <div className="notif-actions">
                    {!booking.read && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onMarkRead(booking.id)}
                      >
                        Mark read
                      </button>
                    )}
                    <a
                      className="btn btn-primary btn-sm"
                      href={replyHref(booking)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Reply
                    </a>
                    <button
                      type="button"
                      className="text-btn danger"
                      onClick={() => onRemoveBooking(booking.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
