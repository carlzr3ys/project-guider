const USER_KEY = 'project_guider_telegram_user'
const TOKEN_KEY = 'project_guider_telegram_token'

export function getApiBase() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

export function apiUrl(path) {
  return `${getApiBase()}${path}`
}

export function readTelegramSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    if (!token || !raw) return null
    return { token, user: JSON.parse(raw) }
  } catch {
    return null
  }
}

export function saveTelegramSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearTelegramSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function fetchAuthConfig() {
  const res = await fetch(apiUrl('/api/auth/config'))
  return res.json()
}

export async function loginWithTelegram(payload) {
  const res = await fetch(apiUrl('/api/auth/telegram'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || 'Telegram login failed.',
      isMember: data.isMember === true,
      user: data.user || null,
    }
  }
  saveTelegramSession({ token: data.token, user: data.user })
  return data
}

export async function refreshTelegramSession() {
  const session = readTelegramSession()
  if (!session?.token) return null

  const res = await fetch(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${session.token}` },
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    clearTelegramSession()
    return null
  }
  saveTelegramSession({ token: session.token, user: data.user })
  return { token: session.token, user: data.user, isMember: true }
}

export async function logoutTelegram() {
  const session = readTelegramSession()
  if (session?.token) {
    try {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
    } catch {
      // ignore network errors on logout
    }
  }
  clearTelegramSession()
}

export async function notifyAdminBooking(booking) {
  const res = await fetch(apiUrl('/api/bookings/notify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || 'Could not notify admin on Telegram.',
    }
  }
  return data
}

export function displayName(user) {
  if (!user) return ''
  if (user.username) return `@${user.username}`
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Telegram user'
}
