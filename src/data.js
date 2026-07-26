export const BRAND = {
  name: 'Project Guider',
  tagline: 'By Ree & Luq',
  fullName: 'Project Guider By Ree & Luq',
  telegramChannel: 'https://t.me/+uD81UyseH_tkZGU1',
  description:
    'Stuck with a coding/programming project? Reach out to our admins for guidance.',
}

/** Seed accounts — stored in localStorage after first load */
export const DEFAULT_ADMIN_ACCOUNTS = [
  {
    username: 'ree',
    password: 'ree123',
    displayName: 'Ree',
    freelancerId: 'ree',
  },
  {
    username: 'luq',
    password: 'luq123',
    displayName: 'Luq',
    freelancerId: 'luq',
  },
]

/** @deprecated use store.admins — kept for older session migration */
export const ADMIN_ACCOUNTS = DEFAULT_ADMIN_ACCOUNTS

export const AUTH_STORAGE_KEY = 'project_guider_admin_session'

export const STORAGE_KEYS = {
  freelancers: 'project_guider_freelancers_v2',
  bookings: 'project_guider_bookings_v1',
  admins: 'project_guider_admins_v1',
  joinRequests: 'project_guider_join_requests_v1',
}

export const DEFAULT_FREELANCERS = [
  {
    id: 'ree',
    name: 'Ree',
    role: 'Project Guide · Coding Mentor',
    bio: 'I help with coding projects, debugging, and step-by-step guidance.',
    status: 'free',
    contact: {
      telegram: 'reereeassign',
      telegramUrl: 'https://t.me/reereeassign',
    },
    // Numeric Telegram user id for bot DMs (must /start the bot first)
    notifyChatId: '883323653',
    avatar: 'RE',
    photoUrl: '',
  },
  {
    id: 'luq',
    name: 'Luq',
    role: 'Project Guide · Programming Help',
    bio: 'Need programming help? I guide you through your project from start to finish.',
    status: 'free',
    contact: {
      telegram: 'Qaqu0',
      telegramUrl: 'https://t.me/Qaqu0',
    },
    // Numeric id — @username DM often fails with "chat not found"
    notifyChatId: '7912382530',
    avatar: 'LQ',
    photoUrl: '',
  },
]

export function slugifyUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

export function isValidUsername(value) {
  return /^[a-z0-9_]{3,20}$/.test(value)
}

function mergeFreelancer(base, saved = {}) {
  return {
    ...base,
    ...saved,
    id: base.id,
    contact: {
      ...(base.contact || {}),
      ...(saved.contact || {}),
    },
    bio: saved.bio ?? base.bio ?? '',
    photoUrl: saved.photoUrl || '',
    notifyChatId: saved.notifyChatId || base.notifyChatId || '',
    avatar: saved.avatar || base.avatar || 'PG',
    status:
      saved.status === 'busy'
        ? 'busy'
        : saved.status === 'chill' || saved.status === 'not_too_busy'
          ? 'chill'
          : saved.status === 'free'
            ? 'free'
            : base.status || 'free',
  }
}

export function normalizeFreelancers(list) {
  const saved = Array.isArray(list) ? list : []
  const byId = new Map(saved.map((f) => [f.id, f]))

  const defaults = DEFAULT_FREELANCERS.map((base) =>
    mergeFreelancer(base, byId.get(base.id) || {}),
  )

  const defaultIds = new Set(DEFAULT_FREELANCERS.map((f) => f.id))
  const extras = saved
    .filter((f) => f?.id && !defaultIds.has(f.id))
    .map((f) =>
      mergeFreelancer(
        {
          id: f.id,
          name: f.name || f.id,
          role: f.role || 'Project Guide',
          bio: f.bio || '',
          status: 'free',
          contact: {
            telegram: f.contact?.telegram || f.id,
            telegramUrl:
              f.contact?.telegramUrl ||
              `https://t.me/${f.contact?.telegram || f.id}`,
          },
          avatar: f.avatar || 'PG',
          photoUrl: '',
        },
        f,
      ),
    )

  return [...defaults, ...extras]
}

export function normalizeAdmins(list) {
  const saved = Array.isArray(list) ? list : []
  if (saved.length === 0) return DEFAULT_ADMIN_ACCOUNTS.map((a) => ({ ...a }))

  const byUser = new Map(
    saved.map((a) => [String(a.username || '').toLowerCase(), a]),
  )

  const mergedDefaults = DEFAULT_ADMIN_ACCOUNTS.map((base) => {
    const existing = byUser.get(base.username)
    return existing
      ? {
          ...base,
          ...existing,
          username: base.username,
          freelancerId: existing.freelancerId || base.freelancerId,
        }
      : { ...base }
  })

  const defaultUsers = new Set(DEFAULT_ADMIN_ACCOUNTS.map((a) => a.username))
  const extras = saved.filter(
    (a) => a?.username && !defaultUsers.has(String(a.username).toLowerCase()),
  )

  return [...mergedDefaults, ...extras]
}
