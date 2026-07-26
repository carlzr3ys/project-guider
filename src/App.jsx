import { useEffect, useRef, useState } from 'react'
import AdminPanel from './components/AdminPanel'
import BookModal from './components/BookModal'
import BottomBar from './components/BottomBar'
import ContactModal from './components/ContactModal'
import Header from './components/Header'
import Hero from './components/Hero'
import JoinTeamSection from './components/JoinTeamSection'
import LoginPage from './components/LoginPage'
import StatusBoard from './components/StatusBoard'
import Toast from './components/Toast'
import { AUTH_STORAGE_KEY } from './data'
import { useLenis } from './hooks/useLenis'
import { useStore } from './hooks/useStore'
import { useTelegramAuth } from './hooks/useTelegramAuth'
import { notifyAdminBooking } from './auth/telegramAuth'
import {
  ensureNotifyPermission,
  pushBookingAlert,
  updateDocTitle,
} from './utils/notify'

function getInitialView() {
  return window.location.hash === '#admin' ? 'admin' : 'home'
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const store = useStore()
  const telegramAuth = useTelegramAuth()
  const [view, setView] = useState(getInitialView)
  const [adminUser, setAdminUser] = useState(readSession)
  const [bookOpen, setBookOpen] = useState(false)
  const [bookTarget, setBookTarget] = useState(null)
  const [contactPerson, setContactPerson] = useState(null)
  const [toast, setToast] = useState('')
  const seenIdsRef = useRef(new Set(store.bookings.map((b) => b.id)))
  const modalOpen = bookOpen || Boolean(contactPerson)
  const { scrollTo } = useLenis({ paused: modalOpen })

  useEffect(() => {
    const onHash = () => setView(getInitialView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(id)
  }, [toast])

  const myUnread = adminUser
    ? store.getUnreadForAdmin(adminUser.freelancerId)
    : 0

  const adminBadge = myUnread + (adminUser ? store.pendingJoinCount : 0)

  useEffect(() => {
    updateDocTitle(adminUser ? adminBadge : 0)

    if (!adminUser) {
      seenIdsRef.current = new Set(store.bookings.map((b) => b.id))
      return
    }

    const mine = store.bookings.filter(
      (b) => b.freelancerId === adminUser.freelancerId,
    )
    const fresh = mine.filter((b) => !seenIdsRef.current.has(b.id) && !b.read)

    if (fresh.length > 0) {
      const latest = fresh[0]
      const alert = pushBookingAlert(latest)
      setToast(`${alert.title}: ${latest.clientName}`)
    }

    seenIdsRef.current = new Set(store.bookings.map((b) => b.id))
  }, [store.bookings, adminUser, adminBadge])

  function navigate(next) {
    setView(next)
    window.location.hash = next === 'admin' ? 'admin' : 'home'
    scrollTo(0, { immediate: false })
  }

  function scrollToTeam() {
    scrollTo('#status')
  }

  function openBook(person = null) {
    if (!store.anyoneAvailable) return
    setBookTarget(person)
    setBookOpen(true)
  }

  async function handleBooking(payload) {
    const admin = store.freelancers.find((f) => f.id === payload.freelancerId)
    const booking = store.addBooking(payload)
    setBookOpen(false)
    setBookTarget(null)

    if (adminUser && adminUser.freelancerId === booking.freelancerId) {
      pushBookingAlert(booking)
    }

    const notifyPayload = {
      ...booking,
      adminTelegram: admin?.contact?.telegram || '',
      notifyChatId: admin?.notifyChatId || '',
    }

    try {
      const notify = await notifyAdminBooking(notifyPayload)
      if (notify.ok) {
        setToast(
          `Booking sent! ${payload.freelancerName} was notified on Telegram.`,
        )
      } else {
        setToast(
          `Booking saved, but Telegram notify failed: ${notify.error}`,
        )
      }
    } catch {
      setToast(
        'Booking saved, but could not reach Telegram notify server.',
      )
    }
  }

  async function handleLogin(username, password) {
    const account = store.findAdmin(username, password)

    if (!account) {
      return { ok: false, error: 'Incorrect username or password.' }
    }

    const session = {
      username: account.username,
      displayName: account.displayName,
      freelancerId: account.freelancerId,
      // Kept for syncing status/profile to server so all visitors see updates
      password,
    }
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    setAdminUser(session)
    seenIdsRef.current = new Set(store.bookings.map((b) => b.id))

    const permission = await ensureNotifyPermission()
    setToast(
      permission === 'granted'
        ? `Welcome, ${account.displayName}! Booking alerts are ON.`
        : `Welcome, ${account.displayName}! Enable alerts in the Admin panel.`,
    )
    return { ok: true }
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    setAdminUser(null)
    updateDocTitle(0)
    setToast('Logged out.')
  }

  function adminCredentials() {
    if (!adminUser?.username || !adminUser?.password) return null
    return { username: adminUser.username, password: adminUser.password }
  }

  async function handleSetStatus(id, status) {
    if (!adminUser) return
    const result = await store.setOwnStatus(
      id,
      adminUser.freelancerId,
      status,
      adminCredentials(),
    )
    if (!result?.ok) {
      setToast(result?.error || 'Status saved only on this device.')
      return
    }
    setToast('Status updated for everyone.')
  }

  async function handleUpdateProfile(updates) {
    if (!adminUser) return { ok: false, error: 'Not allowed.' }
    const result = await store.updateOwnProfile(
      adminUser.freelancerId,
      updates,
      adminCredentials(),
    )
    if (result.ok) {
      const nextSession = {
        ...adminUser,
        displayName: result.name,
      }
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      setAdminUser(nextSession)
      setToast('Profile updated.')
    }
    return result
  }

  async function handleChangePassword(payload) {
    if (!adminUser) return { ok: false, error: 'Not allowed.' }
    const result = await store.changePassword(
      adminUser.username,
      payload,
      adminCredentials(),
    )
    if (result.ok) {
      const nextSession = { ...adminUser, password: payload.newPassword }
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      setAdminUser(nextSession)
      setToast('Password updated.')
    }
    return result
  }

  async function handleAddAdmin(payload) {
    const result = await store.addAdmin(payload, adminCredentials())
    if (result.ok) {
      setToast(`Admin @${result.account.username} created.`)
    }
    return result
  }

  function handleJoinRequest(payload) {
    const result = store.submitJoinRequest(payload)
    if (result.ok) setToast('Join request submitted.')
    return result
  }

  async function handleApproveJoin(id, data) {
    const result = await store.approveJoinRequest(id, data, adminCredentials())
    if (result.ok) {
      setToast(`Approved @${result.account.username}.`)
    }
    return result
  }

  function handleRejectJoin(id) {
    store.rejectJoinRequest(id)
    setToast('Join request rejected.')
    return { ok: true }
  }

  const isAdminLoggedIn = Boolean(adminUser)
  const myBookings = adminUser
    ? store.getBookingsForAdmin(adminUser.freelancerId)
    : []

  return (
    <div className={`app ${view === 'home' ? 'has-bottom-bar' : ''}`}>
      <Header
        view={view}
        onNavigate={navigate}
        unreadCount={adminBadge}
        isAdminLoggedIn={isAdminLoggedIn}
        telegramUser={telegramAuth.user}
        telegramDisplayName={telegramAuth.displayName}
        onTelegramLogout={async () => {
          await telegramAuth.logout()
          setToast('Telegram logged out.')
        }}
      />

      {view === 'home' ? (
        <>
          <Hero
            anyoneAvailable={store.anyoneAvailable}
            onScrollToTeam={scrollToTeam}
          />
          <StatusBoard
            freelancers={store.freelancers}
            onBook={openBook}
            onContact={setContactPerson}
          />
          <JoinTeamSection onSubmit={handleJoinRequest} />
          <BottomBar
            anyoneAvailable={store.anyoneAvailable}
            onBook={() => openBook(null)}
          />
        </>
      ) : isAdminLoggedIn ? (
        <AdminPanel
          freelancerId={adminUser.freelancerId}
          freelancers={store.freelancers}
          myBookings={myBookings}
          myUnread={myUnread}
          joinRequests={store.joinRequests}
          pendingJoinCount={store.pendingJoinCount}
          onSetStatus={handleSetStatus}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
          onAddAdmin={handleAddAdmin}
          onApproveJoin={handleApproveJoin}
          onRejectJoin={handleRejectJoin}
          onMarkRead={store.markRead}
          onMarkAllRead={() =>
            store.markAllReadForAdmin(adminUser.freelancerId)
          }
          onRemoveBooking={store.removeBooking}
          onLogout={handleLogout}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}

      <BookModal
        open={bookOpen}
        freelancers={store.freelancers}
        selected={bookTarget}
        telegramAuth={telegramAuth}
        onToast={setToast}
        onClose={() => {
          setBookOpen(false)
          setBookTarget(null)
        }}
        onSubmit={handleBooking}
      />

      <ContactModal
        open={Boolean(contactPerson)}
        person={contactPerson}
        onClose={() => setContactPerson(null)}
      />

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}
