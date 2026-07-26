const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const storePath = path.join(__dirname, 'data', 'store.json')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(String(password), salt, 64)
  return `${salt}:${derivedKey.toString('hex')}`
}

function verifyPassword(password, stored) {
  if (!password || !stored || typeof stored !== 'string' || !stored.includes(':')) {
    return false
  }
  try {
    const [salt, keyHex] = stored.split(':')
    if (!salt || !keyHex) return false
    const keyBuffer = Buffer.from(keyHex, 'hex')
    const derivedKey = crypto.scryptSync(String(password), salt, keyBuffer.length)
    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  } catch {
    return false
  }
}

function getInitialAdminAccounts() {
  const reePass = process.env.ADMIN_REE_PASSWORD || ''
  const luqPass = process.env.ADMIN_LUQ_PASSWORD || ''

  if (!reePass || !luqPass) {
    console.warn(
      '[Security Warning] ADMIN_REE_PASSWORD or ADMIN_LUQ_PASSWORD is not set in environment. Generating secure ephemeral defaults...',
    )
  }

  const finalReePass = reePass || crypto.randomBytes(12).toString('hex')
  const finalLuqPass = luqPass || crypto.randomBytes(12).toString('hex')

  if (!reePass) console.log(`[Admin Seed] Ree temporary password: ${finalReePass}`)
  if (!luqPass) console.log(`[Admin Seed] Luq temporary password: ${finalLuqPass}`)

  return [
    {
      username: 'ree',
      passwordHash: hashPassword(finalReePass),
      displayName: 'Ree',
      freelancerId: 'ree',
    },
    {
      username: 'luq',
      passwordHash: hashPassword(finalLuqPass),
      displayName: 'Luq',
      freelancerId: 'luq',
    },
  ]
}

function getInitialFreelancers() {
  return [
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
      notifyChatId: process.env.TELEGRAM_NOTIFY_REE || '',
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
      notifyChatId: process.env.TELEGRAM_NOTIFY_LUQ || '',
      avatar: 'LQ',
      photoUrl: '',
    },
  ]
}

function ensureStore() {
  const dir = path.dirname(storePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(storePath)) {
    const seed = {
      freelancers: getInitialFreelancers(),
      admins: getInitialAdminAccounts(),
      joinRequests: [],
      updatedAt: new Date().toISOString(),
    }
    atomicWriteFileSync(storePath, JSON.stringify(seed, null, 2))
  }
}

function atomicWriteFileSync(filePath, content) {
  const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  fs.writeFileSync(tempPath, content, 'utf8')
  fs.renameSync(tempPath, filePath)
}

function readStore() {
  ensureStore()
  try {
    const raw = fs.readFileSync(storePath, 'utf8')
    const data = JSON.parse(raw)
    let admins = Array.isArray(data.admins) ? data.admins : []

    let needsSave = false
    admins = admins.map((admin) => {
      if (admin.password && !admin.passwordHash) {
        needsSave = true
        return {
          username: admin.username,
          displayName: admin.displayName || admin.username,
          freelancerId: admin.freelancerId || admin.username,
          passwordHash: hashPassword(admin.password),
        }
      }
      return admin
    })

    if (admins.length === 0) {
      admins = getInitialAdminAccounts()
      needsSave = true
    }

    const freelancers = Array.isArray(data.freelancers)
      ? data.freelancers
      : getInitialFreelancers()

    const joinRequests = Array.isArray(data.joinRequests) ? data.joinRequests : []

    const payload = {
      freelancers,
      admins,
      joinRequests,
      updatedAt: data.updatedAt || new Date().toISOString(),
    }

    if (needsSave) {
      atomicWriteFileSync(storePath, JSON.stringify(payload, null, 2))
    }

    return payload
  } catch {
    return {
      freelancers: getInitialFreelancers(),
      admins: getInitialAdminAccounts(),
      joinRequests: [],
      updatedAt: null,
    }
  }
}

function writeStore(next) {
  ensureStore()
  const payload = {
    freelancers: next.freelancers,
    admins: next.admins,
    joinRequests: next.joinRequests || [],
    updatedAt: new Date().toISOString(),
  }
  atomicWriteFileSync(storePath, JSON.stringify(payload, null, 2))
  return payload
}

function normalizeStatus(value) {
  if (value === 'busy') return 'busy'
  if (value === 'chill' || value === 'not_too_busy') return 'chill'
  return 'free'
}

function findAdmin(username, password) {
  if (!username || !password) return null
  const { admins } = readStore()
  const targetUser = String(username).toLowerCase().trim()
  const admin = admins.find(
    (a) => String(a.username || '').toLowerCase().trim() === targetUser,
  )
  if (!admin || !admin.passwordHash) return null
  if (verifyPassword(password, admin.passwordHash)) {
    return admin
  }
  return null
}

function findAdminByUsername(username) {
  if (!username) return null
  const { admins } = readStore()
  const targetUser = String(username).toLowerCase().trim()
  const admin = admins.find(
    (a) => String(a.username || '').toLowerCase().trim() === targetUser,
  )
  if (!admin) return null
  const { passwordHash, ...safeAdmin } = admin
  return safeAdmin
}

function publicFreelancers() {
  return readStore().freelancers.map((f) => {
    const { notifyChatId, ...publicData } = f
    return publicData
  })
}

function setStatus({ id, status, username, password }) {
  const admin = findAdmin(username, password)
  if (!admin) return { ok: false, error: 'Invalid admin login credentials.', code: 401 }
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
  if (!admin) return { ok: false, error: 'Invalid admin login credentials.', code: 401 }
  if (admin.freelancerId !== id) {
    return { ok: false, error: 'You can only edit your own profile.', code: 403 }
  }

  const store = readStore()
  const name = String(updates.name || '').trim().slice(0, 100)
  const role = String(updates.role || '').trim().slice(0, 100)
  const bio = String(updates.bio || '').trim().slice(0, 1000)
  const telegram = String(updates.telegram || '')
    .trim()
    .replace(/^@/, '')
    .slice(0, 50)
  const notifyChatId = String(updates.notifyChatId || '')
    .trim()
    .replace(/[^\d-]/g, '')
    .slice(0, 50)

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
        updates.photoUrl === undefined ? f.photoUrl : String(updates.photoUrl || '').slice(0, 500),
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

  const saved = writeStore({ freelancers, admins, joinRequests: store.joinRequests })
  return { ok: true, freelancers: saved.freelancers }
}

function replaceTeam({ freelancers, admins, username, password }) {
  const admin = findAdmin(username, password)
  if (!admin) return { ok: false, error: 'Invalid admin login credentials.', code: 401 }
  if (!Array.isArray(freelancers) || !Array.isArray(admins)) {
    return { ok: false, error: 'Invalid payload.', code: 400 }
  }
  const store = readStore()
  const saved = writeStore({ freelancers, admins, joinRequests: store.joinRequests })
  return { ok: true, freelancers: saved.freelancers }
}

function readJoinRequests() {
  return readStore().joinRequests || []
}

function createJoinRequest(payload = {}) {
  const store = readStore()
  const name = String(payload.name || '').trim().slice(0, 100)
  const telegram = String(payload.telegram || '')
    .trim()
    .replace(/^@/, '')
    .slice(0, 50)
  const username = String(payload.username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
  const role = String(payload.role || '').trim().slice(0, 100)
  const message = String(payload.message || '').trim().slice(0, 1000)

  if (!name) return { ok: false, error: 'Name is required.', code: 400 }
  if (!telegram) return { ok: false, error: 'Telegram username is required.', code: 400 }
  if (!username || username.length < 3) {
    return { ok: false, error: 'Preferred username must be 3–20 characters.', code: 400 }
  }

  const existingAdmin = store.admins.some(
    (a) => String(a.username || '').toLowerCase() === username,
  )
  if (existingAdmin) {
    return { ok: false, error: 'That username is already taken by an admin.', code: 400 }
  }

  const pendingExists = (store.joinRequests || []).some(
    (r) => r.status === 'pending' && String(r.username || '').toLowerCase() === username,
  )
  if (pendingExists) {
    return { ok: false, error: 'A pending request already uses that username.', code: 400 }
  }

  const request = {
    id: `jr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
    name,
    telegram,
    username,
    role: role || 'Project Guide',
    message,
  }

  const joinRequests = [request, ...(store.joinRequests || [])]
  writeStore({ ...store, joinRequests })
  return { ok: true, request }
}

function resolveJoinRequest({ requestId, status, adminUsername, adminPassword }) {
  if (adminUsername || adminPassword) {
    const admin = findAdmin(adminUsername, adminPassword)
    if (!admin) return { ok: false, error: 'Invalid admin credentials.', code: 401 }
  }
  const store = readStore()
  let target = null
  const joinRequests = (store.joinRequests || []).map((r) => {
    if (r.id !== requestId) return r
    target = { ...r, status, resolvedAt: new Date().toISOString() }
    return target
  })

  if (!target) return { ok: false, error: 'Request not found.', code: 404 }

  writeStore({ ...store, joinRequests })
  return { ok: true, request: target }
}

module.exports = {
  readStore,
  publicFreelancers,
  setStatus,
  updateProfile,
  replaceTeam,
  findAdmin,
  findAdminByUsername,
  hashPassword,
  verifyPassword,
  readJoinRequests,
  createJoinRequest,
  resolveJoinRequest,
}
