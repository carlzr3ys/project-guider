import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchFreelancers,
  pushProfile,
  pushStatus,
  pushTeam,
} from '../api/storeApi'
import {
  isValidUsername,
  normalizeAdmins,
  normalizeFreelancers,
  slugifyUsername,
  STORAGE_KEYS,
} from '../data'
import { initialsFromName } from '../utils/image'
import { isBookable, normalizeStatus, STATUS } from '../utils/status'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function buildFreelancerProfile({ id, name, role, bio, telegram, status }) {
  const handle = slugifyUsername(telegram || id)
  return {
    id,
    name,
    role: role || 'Project Guide',
    bio: bio || '',
    status: normalizeStatus(status || STATUS.free),
    contact: {
      telegram: handle,
      telegramUrl: `https://t.me/${handle}`,
    },
    avatar: initialsFromName(name),
    photoUrl: '',
  }
}

export function useStore() {
  const [freelancers, setFreelancers] = useState(() =>
    normalizeFreelancers(readJson(STORAGE_KEYS.freelancers, [])),
  )
  const [bookings, setBookings] = useState(() =>
    readJson(STORAGE_KEYS.bookings, []),
  )
  const [admins, setAdmins] = useState(() =>
    normalizeAdmins(readJson(STORAGE_KEYS.admins, [])),
  )
  const [joinRequests, setJoinRequests] = useState(() =>
    readJson(STORAGE_KEYS.joinRequests, []),
  )

  const serverSyncRef = useRef(true)

  const applyServerFreelancers = useCallback((list) => {
    const next = normalizeFreelancers(list)
    setFreelancers((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    )
  }, [])

  useEffect(() => {
    let alive = true

    async function pullFromServer() {
      try {
        const list = await fetchFreelancers()
        if (alive) applyServerFreelancers(list)
        serverSyncRef.current = true
      } catch {
        serverSyncRef.current = false
      }
    }

    pullFromServer()
    const poll = window.setInterval(pullFromServer, 4000)

    function syncLocalExtras() {
      const nextBookings = readJson(STORAGE_KEYS.bookings, [])
      const nextAdmins = normalizeAdmins(readJson(STORAGE_KEYS.admins, []))
      const nextRequests = readJson(STORAGE_KEYS.joinRequests, [])

      setBookings((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextBookings)
          ? prev
          : nextBookings,
      )
      setAdmins((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextAdmins) ? prev : nextAdmins,
      )
      setJoinRequests((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextRequests)
          ? prev
          : nextRequests,
      )
    }

    function onStorage(e) {
      if (
        e.key === STORAGE_KEYS.bookings ||
        e.key === STORAGE_KEYS.admins ||
        e.key === STORAGE_KEYS.joinRequests ||
        e.key === null
      ) {
        syncLocalExtras()
      }
    }

    window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      window.removeEventListener('storage', onStorage)
      window.clearInterval(poll)
    }
  }, [applyServerFreelancers])

  useEffect(() => {
    writeJson(STORAGE_KEYS.freelancers, freelancers)
  }, [freelancers])

  useEffect(() => {
    writeJson(STORAGE_KEYS.bookings, bookings)
  }, [bookings])

  useEffect(() => {
    writeJson(STORAGE_KEYS.admins, admins)
  }, [admins])

  useEffect(() => {
    writeJson(STORAGE_KEYS.joinRequests, joinRequests)
  }, [joinRequests])

  const anyoneAvailable = freelancers.some((f) => isBookable(f.status))
  const unreadCount = bookings.filter((b) => !b.read).length
  const pendingJoinCount = joinRequests.filter((r) => r.status === 'pending').length

  const getBookingsForAdmin = useCallback(
    (freelancerId) =>
      bookings.filter((b) => b.freelancerId === freelancerId),
    [bookings],
  )

  const getUnreadForAdmin = useCallback(
    (freelancerId) =>
      bookings.filter((b) => b.freelancerId === freelancerId && !b.read).length,
    [bookings],
  )

  const findAdmin = useCallback(
    (username, password) =>
      admins.find(
        (a) =>
          a.username.toLowerCase() === String(username || '').toLowerCase() &&
          a.password === password,
      ),
    [admins],
  )

  const setOwnStatus = useCallback(async (id, actorId, status, credentials) => {
    if (actorId && id !== actorId) {
      return { ok: false, error: 'You can only change your own status.' }
    }

    const nextStatus = normalizeStatus(status)
    setFreelancers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f)),
    )

    if (!credentials?.username || !credentials?.password) {
      return {
        ok: false,
        error: 'Re-login as admin so status can sync for everyone.',
      }
    }

    try {
      const list = await pushStatus({
        id,
        status: nextStatus,
        username: credentials.username,
        password: credentials.password,
      })
      applyServerFreelancers(list)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message || 'Could not sync status.' }
    }
  }, [applyServerFreelancers])

  const updateOwnProfile = useCallback(async (actorId, updates, credentials) => {
    if (!actorId) return { ok: false, error: 'Not allowed.' }

    const name = updates.name?.trim()
    const role = updates.role?.trim()
    const bio = updates.bio?.trim()
    const telegram = updates.telegram?.trim().replace(/^@/, '')
    const notifyChatId = String(updates.notifyChatId || '')
      .trim()
      .replace(/[^\d-]/g, '')

    if (!name) return { ok: false, error: 'Name cannot be empty.' }
    if (!role) return { ok: false, error: 'Title / role cannot be empty.' }

    setFreelancers((prev) =>
      prev.map((f) => {
        if (f.id !== actorId) return f
        return {
          ...f,
          name,
          role,
          bio: bio || '',
          avatar: initialsFromName(name),
          photoUrl:
            updates.photoUrl === undefined ? f.photoUrl : updates.photoUrl,
          notifyChatId:
            updates.notifyChatId === undefined
              ? f.notifyChatId || ''
              : notifyChatId,
          contact: {
            ...f.contact,
            telegram: telegram || f.contact.telegram,
            telegramUrl: telegram
              ? `https://t.me/${telegram}`
              : f.contact.telegramUrl,
          },
        }
      }),
    )

    setAdmins((prev) =>
      prev.map((a) =>
        a.freelancerId === actorId ? { ...a, displayName: name } : a,
      ),
    )

    if (credentials?.username && credentials?.password) {
      try {
        const list = await pushProfile({
          id: actorId,
          updates: {
            name,
            role,
            bio: bio || '',
            telegram,
            notifyChatId,
            photoUrl: updates.photoUrl,
          },
          username: credentials.username,
          password: credentials.password,
        })
        applyServerFreelancers(list)
      } catch (error) {
        return { ok: false, error: error.message || 'Could not sync profile.' }
      }
    }

    return { ok: true, name }
  }, [applyServerFreelancers])

  const changePassword = useCallback(
    async (
      username,
      { currentPassword, newPassword, confirmPassword },
      credentials,
    ) => {
      const account = admins.find(
        (a) => a.username.toLowerCase() === String(username || '').toLowerCase(),
      )
      if (!account) return { ok: false, error: 'Account not found.' }
      if (account.password !== currentPassword) {
        return { ok: false, error: 'Current password is incorrect.' }
      }
      if (!newPassword || newPassword.length < 6) {
        return { ok: false, error: 'New password must be at least 6 characters.' }
      }
      if (newPassword !== confirmPassword) {
        return { ok: false, error: 'New passwords do not match.' }
      }

      const nextAdmins = admins.map((a) =>
        a.username.toLowerCase() === account.username.toLowerCase()
          ? { ...a, password: newPassword }
          : a,
      )
      setAdmins(nextAdmins)

      if (credentials?.username && credentials?.password) {
        try {
          await pushTeam({
            freelancers,
            admins: nextAdmins,
            username: credentials.username,
            password: credentials.password,
          })
        } catch (error) {
          return { ok: false, error: error.message || 'Could not sync password.' }
        }
      }

      return { ok: true }
    },
    [admins, freelancers],
  )

  const addAdmin = useCallback(
    async (payload, credentials) => {
      const username = slugifyUsername(payload.username)
      const password = payload.password || ''
      const name = payload.name?.trim()
      const role = payload.role?.trim() || 'Project Guide'
      const bio = payload.bio?.trim() || ''
      const telegram = slugifyUsername(payload.telegram || username)

      if (!isValidUsername(username)) {
        return {
          ok: false,
          error: 'Username must be 3–20 characters (a-z, 0-9, _).',
        }
      }
      if (password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' }
      }
      if (!name) return { ok: false, error: 'Name is required.' }
      if (admins.some((a) => a.username.toLowerCase() === username)) {
        return { ok: false, error: 'Username already exists.' }
      }
      if (freelancers.some((f) => f.id === username)) {
        return { ok: false, error: 'That profile id is already taken.' }
      }

      const account = {
        username,
        password,
        displayName: name,
        freelancerId: username,
      }

      const profile = buildFreelancerProfile({
        id: username,
        name,
        role,
        bio,
        telegram,
        status: 'free',
      })

      const nextAdmins = [...admins, account]
      const nextFreelancers = [...freelancers, profile]
      setAdmins(nextAdmins)
      setFreelancers(nextFreelancers)

      if (credentials?.username && credentials?.password) {
        try {
          const list = await pushTeam({
            freelancers: nextFreelancers,
            admins: nextAdmins,
            username: credentials.username,
            password: credentials.password,
          })
          applyServerFreelancers(list)
        } catch (error) {
          return { ok: false, error: error.message || 'Could not sync new admin.' }
        }
      }

      return { ok: true, account }
    },
    [admins, freelancers, applyServerFreelancers],
  )

  const submitJoinRequest = useCallback(
    (payload) => {
      const name = payload.name?.trim()
      const telegram = slugifyUsername(payload.telegram)
      const username = slugifyUsername(payload.username)
      const role = payload.role?.trim() || 'Project Guide'
      const message = payload.message?.trim() || ''

      if (!name) return { ok: false, error: 'Name is required.' }
      if (!telegram) return { ok: false, error: 'Telegram username is required.' }
      if (!isValidUsername(username)) {
        return {
          ok: false,
          error: 'Preferred username must be 3–20 characters (a-z, 0-9, _).',
        }
      }
      if (admins.some((a) => a.username.toLowerCase() === username)) {
        return { ok: false, error: 'That username is already taken.' }
      }
      if (
        joinRequests.some(
          (r) => r.status === 'pending' && r.username === username,
        )
      ) {
        return { ok: false, error: 'A pending request already uses that username.' }
      }

      const request = {
        id: `jr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
        name,
        telegram,
        username,
        role,
        message,
      }

      setJoinRequests((prev) => [request, ...prev])
      return { ok: true, request }
    },
    [admins, joinRequests],
  )

  const approveJoinRequest = useCallback(
    async (requestId, { password }, credentials) => {
      const request = joinRequests.find((r) => r.id === requestId)
      if (!request || request.status !== 'pending') {
        return { ok: false, error: 'Request not found.' }
      }

      const created = await addAdmin(
        {
          username: request.username,
          password,
          name: request.name,
          role: request.role,
          bio: request.message,
          telegram: request.telegram,
        },
        credentials,
      )

      if (!created.ok) return created

      setJoinRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: 'approved',
                resolvedAt: new Date().toISOString(),
              }
            : r,
        ),
      )

      return { ok: true, account: created.account }
    },
    [addAdmin, joinRequests],
  )

  const rejectJoinRequest = useCallback((requestId) => {
    setJoinRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'rejected',
              resolvedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
    return { ok: true }
  }, [])

  const addBooking = useCallback((payload) => {
    const booking = {
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...payload,
    }
    setBookings((prev) => [booking, ...prev])
    return booking
  }, [])

  const markRead = useCallback((id) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, read: true } : b)),
    )
  }, [])

  const markAllReadForAdmin = useCallback((freelancerId) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.freelancerId === freelancerId ? { ...b, read: true } : b,
      ),
    )
  }, [])

  const removeBooking = useCallback((id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return {
    freelancers,
    bookings,
    admins,
    joinRequests,
    anyoneAvailable,
    /** @deprecated use anyoneAvailable */
    anyoneFree: anyoneAvailable,
    unreadCount,
    pendingJoinCount,
    getBookingsForAdmin,
    getUnreadForAdmin,
    findAdmin,
    setOwnStatus,
    updateOwnProfile,
    changePassword,
    addAdmin,
    submitJoinRequest,
    approveJoinRequest,
    rejectJoinRequest,
    addBooking,
    markRead,
    markAllReadForAdmin,
    removeBooking,
  }
}
