const fs = require('fs')
const path = require('path')

const storePath = path.join(__dirname, 'data', 'store.json')

const DEFAULT_ADMINS = [
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

const DEFAULT_FREELANCERS = [
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
    notifyChatId: '7912382530',
    avatar: 'LQ',
    photoUrl: '',
  },
]

function ensureStore() {
  const dir = path.dirname(storePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(storePath)) {
    const seed = {
      freelancers: DEFAULT_FREELANCERS,
      admins: DEFAULT_ADMINS,
      updatedAt: new Date().toISOString(),
    }
    fs.writeFileSync(storePath, JSON.stringify(seed, null, 2))
  }
}

function readStore() {
  ensureStore()
  try {
    const raw = fs.readFileSync(storePath, 'utf8')
    const data = JSON.parse(raw)
    return {
      freelancers: Array.isArray(data.freelancers)
        ? data.freelancers
        : DEFAULT_FREELANCERS,
      admins: Array.isArray(data.admins) ? data.admins : DEFAULT_ADMINS,
      updatedAt: data.updatedAt || null,
    }
  } catch {
    return {
      freelancers: DEFAULT_FREELANCERS,
      admins: DEFAULT_ADMINS,
      updatedAt: null,
    }
  }
}

function writeStore(next) {
  ensureStore()
  const payload = {
    freelancers: next.freelancers,
    admins: next.admins,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(storePath, JSON.stringify(payload, null, 2))
  return payload
}

function normalizeStatus(value) {
  if (value === 'busy') return 'busy'
  if (value === 'chill' || value === 'not_too_busy') return 'chill'
  return 'free'
}

function findAdmin(username, password) {
  const { admins } = readStore()
  return (
    admins.find(
      (a) =>
        String(a.username || '').toLowerCase() ===
          String(username || '').toLowerCase() && a.password === password,
    ) || null
  )
}

function publicFreelancers() {
  return readStore().freelancers
}

function setStatus({ id, status, username, password }) {
  const admin = findAdmin(username, password)
  if (!admin) return { ok: false, error: 'Invalid admin login.', code: 401 }
  if (admin.freelancerId !== id) {
    return { ok: false, error: 'You can only change your own status.', code: 403 }
  }

  const store = readStore()
  const nextStatus = normalizeStatus(status)
  let found = false
  const freelancers = store.freelancers.map((f) => {
    if (f.id !== id) return f
    found = true
    return { ...f, status: nextStatus }
  })
  if (!found) return { ok: false, error: 'Admin profile not found.', code: 404 }

  const saved = writeStore({ ...store, freelancers })
  return { ok: true, freelancers: saved.freelancers }
}

function updateProfile({ id, updates, username, password }) {
  const admin = findAdmin(username, password)
  if (!admin) return { ok: false, error: 'Invalid admin login.', code: 401 }
  if (admin.freelancerId !== id) {
    return { ok: false, error: 'You can only edit your own profile.', code: 403 }
  }

  const store = readStore()
  const name = String(updates.name || '').trim()
  const role = String(updates.role || '').trim()
  const bio = String(updates.bio || '').trim()
  const telegram = String(updates.telegram || '')
    .trim()
    .replace(/^@/, '')
  const notifyChatId = String(updates.notifyChatId || '')
    .trim()
    .replace(/[^\d-]/g, '')

  if (!name) return { ok: false, error: 'Name cannot be empty.', code: 400 }
  if (!role) return { ok: false, error: 'Title / role cannot be empty.', code: 400 }

  const freelancers = store.freelancers.map((f) => {
    if (f.id !== id) return f
    return {
      ...f,
      name,
      role,
      bio,
      avatar: name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      photoUrl:
        updates.photoUrl === undefined ? f.photoUrl : updates.photoUrl || '',
      notifyChatId:
        updates.notifyChatId === undefined
          ? f.notifyChatId || ''
          : notifyChatId,
      contact: {
        ...(f.contact || {}),
        telegram: telegram || f.contact?.telegram || id,
        telegramUrl: telegram
          ? `https://t.me/${telegram}`
          : f.contact?.telegramUrl || `https://t.me/${id}`,
      },
    }
  })

  const admins = store.admins.map((a) =>
    a.freelancerId === id ? { ...a, displayName: name } : a,
  )

  const saved = writeStore({ freelancers, admins })
  return { ok: true, freelancers: saved.freelancers }
}

function replaceTeam({ freelancers, admins, username, password }) {
  const admin = findAdmin(username, password)
  if (!admin) return { ok: false, error: 'Invalid admin login.', code: 401 }
  if (!Array.isArray(freelancers) || !Array.isArray(admins)) {
    return { ok: false, error: 'Invalid payload.', code: 400 }
  }
  const saved = writeStore({ freelancers, admins })
  return { ok: true, freelancers: saved.freelancers }
}

module.exports = {
  readStore,
  publicFreelancers,
  setStatus,
  updateProfile,
  replaceTeam,
  findAdmin,
}
