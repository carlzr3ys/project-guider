const cors = require('cors')
const crypto = require('crypto')
const dotenv = require('dotenv')
const express = require('express')
const fs = require('fs')
const path = require('path')
const storeApi = require('./store.cjs')

const rootDir = path.join(__dirname, '..')
dotenv.config({ path: path.join(rootDir, '.env') })

const app = express()
const PORT = Number(process.env.PORT || process.env.API_PORT || 8787)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const AUTH_MAX_AGE_SEC = Number(process.env.TELEGRAM_AUTH_MAX_AGE || 86400)
const distDir = path.join(rootDir, 'dist')

const MAX_SESSIONS = 1000
const sessions = new Map()

// Clean up expired sessions periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(token)
    }
  }
}, 10 * 60 * 1000)

// --- Security Headers Middleware ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.telegram.org; frame-ancestors 'none';",
  )
  next()
})

// --- Restricted CORS Configuration ---
const configuredAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
]

const allowedOriginsSet = new Set([...configuredAllowedOrigins, ...defaultAllowedOrigins])

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOriginsSet.has(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))

// --- Rate Limiting Middleware ---
function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map()

  setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of hits.entries()) {
      if (record.resetTime <= now) {
        hits.delete(ip)
      }
    }
  }, 60000)

  return function (req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const record = hits.get(ip) || { count: 0, resetTime: now + windowMs }

    if (now > record.resetTime) {
      record.count = 1
      record.resetTime = now + windowMs
    } else {
      record.count += 1
    }

    hits.set(ip, record)

    if (record.count > max) {
      return res.status(429).json({
        ok: false,
        error: message || 'Too many requests. Please try again later.',
      })
    }
    next()
  }
}

const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many admin login attempts. Please try again after 15 minutes.',
})

const telegramAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many auth attempts. Please try again later.',
})

const notifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many booking notification requests. Please try again later.',
})

const joinRequestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many join requests. Please try again later.',
})

const generalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'API rate limit exceeded.',
})

app.use('/api', generalApiLimiter)

// --- Helper Functions ---
function configured() {
  return Boolean(BOT_TOKEN && BOT_USERNAME && CHAT_ID)
}

function verifyTelegramLogin(payload) {
  const { hash, ...rest } = payload
  if (!hash || !BOT_TOKEN) return false

  const checkString = Object.keys(rest)
    .filter((key) => rest[key] !== undefined && rest[key] !== null && rest[key] !== '')
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('\n')

  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest()
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex')
  if (hmac !== hash) return false

  const authDate = Number(rest.auth_date || 0)
  const age = Math.floor(Date.now() / 1000) - authDate
  if (!authDate || age > AUTH_MAX_AGE_SEC) return false

  return true
}

async function checkGroupMembership(userId) {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { ok: false, isMember: false, error: 'Server is missing Telegram config.' }
  }

  const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`)
  url.searchParams.set('chat_id', CHAT_ID)
  url.searchParams.set('user_id', String(userId))

  const res = await fetch(url)
  const data = await res.json()

  if (!data.ok) {
    return {
      ok: false,
      isMember: false,
      error: data.description || 'Could not verify group membership.',
      status: null,
    }
  }

  const status = data.result?.status
  const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status)
  return { ok: true, isMember, status, error: null }
}

function createSession(user, membership = {}, type = 'telegram') {
  if (sessions.size >= MAX_SESSIONS) {
    const now = Date.now()
    for (const [t, s] of sessions.entries()) {
      if (s.expiresAt <= now) sessions.delete(t)
    }
    if (sessions.size >= MAX_SESSIONS) {
      const oldestKey = sessions.keys().next().value
      if (oldestKey) sessions.delete(oldestKey)
    }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const csrfToken = crypto.randomBytes(24).toString('hex')
  const session = {
    token,
    csrfToken,
    user,
    type,
    isMember: membership.isMember ?? true,
    memberStatus: membership.status ?? 'member',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }
  sessions.set(token, session)
  return session
}

function getSession(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  return session
}

// --- Anti-CSRF Verification Middleware for State-Changing Requests ---
function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }
  const session = getSession(req)
  if (!session) {
    return next()
  }
  const reqCsrf = req.headers['x-csrf-token']
  if (!reqCsrf || reqCsrf !== session.csrfToken) {
    return res.status(403).json({ ok: false, error: 'Invalid or missing CSRF token.' })
  }
  next()
}

app.use(verifyCsrf)

// --- API Routes ---

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: configured(),
    botUsername: BOT_USERNAME || null,
  })
})

app.get('/api/freelancers', (_req, res) => {
  res.json({
    ok: true,
    freelancers: storeApi.publicFreelancers(),
    updatedAt: storeApi.readStore().updatedAt,
  })
})

app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password are required.' })
  }

  const admin = storeApi.findAdmin(username, password)
  if (!admin) {
    return res.status(401).json({ ok: false, error: 'Incorrect username or password.' })
  }

  const session = createSession(
    {
      username: admin.username,
      displayName: admin.displayName,
      freelancerId: admin.freelancerId,
    },
    { isMember: true, status: 'admin' },
    'admin',
  )

  return res.json({
    ok: true,
    token: session.token,
    csrfToken: session.csrfToken,
    user: session.user,
  })
})

app.post('/api/freelancers/:id/status', (req, res) => {
  const result = storeApi.setStatus({
    id: req.params.id,
    status: req.body?.status,
    username: req.body?.username,
    password: req.body?.password,
  })
  if (!result.ok) {
    return res.status(result.code || 400).json(result)
  }
  return res.json(result)
})

app.put('/api/freelancers/:id', (req, res) => {
  const result = storeApi.updateProfile({
    id: req.params.id,
    updates: req.body?.updates || req.body || {},
    username: req.body?.username,
    password: req.body?.password,
  })
  if (!result.ok) {
    return res.status(result.code || 400).json(result)
  }
  return res.json(result)
})

app.put('/api/team', (req, res) => {
  const result = storeApi.replaceTeam({
    freelancers: req.body?.freelancers,
    admins: req.body?.admins,
    username: req.body?.username,
    password: req.body?.password,
  })
  if (!result.ok) {
    return res.status(result.code || 400).json(result)
  }
  return res.json(result)
})

app.get('/api/auth/config', (_req, res) => {
  res.json({
    configured: configured(),
    botUsername: BOT_USERNAME || null,
    channelUrl:
      process.env.TELEGRAM_CHANNEL_URL ||
      process.env.VITE_TELEGRAM_CHANNEL ||
      'https://t.me/projectguider',
  })
})

app.post('/api/join-requests', joinRequestLimiter, (req, res) => {
  const result = storeApi.createJoinRequest(req.body)
  if (!result.ok) {
    return res.status(result.code || 400).json(result)
  }
  return res.json(result)
})

app.get('/api/join-requests', (req, res) => {
  const session = getSession(req)
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' })
  }
  return res.json({ ok: true, joinRequests: storeApi.readJoinRequests() })
})

app.post('/api/join-requests/:id/resolve', (req, res) => {
  const session = getSession(req)
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' })
  }
  const result = storeApi.resolveJoinRequest({
    requestId: req.params.id,
    status: req.body?.status,
    adminUsername: req.body?.username,
    adminPassword: req.body?.password,
  })
  if (!result.ok) {
    return res.status(result.code || 400).json(result)
  }
  return res.json(result)
})

app.post('/api/auth/telegram', telegramAuthLimiter, async (req, res) => {
  try {
    if (!configured()) {
      return res.status(503).json({
        ok: false,
        error:
          'Telegram login is not configured yet. Set TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, and TELEGRAM_CHAT_ID in .env',
      })
    }

    const payload = req.body || {}
    if (!verifyTelegramLogin(payload)) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid or expired Telegram login. Please try again.',
      })
    }

    const user = {
      id: Number(payload.id),
      firstName: String(payload.first_name || '').slice(0, 100),
      lastName: String(payload.last_name || '').slice(0, 100),
      username: String(payload.username || '').slice(0, 100),
      photoUrl: String(payload.photo_url || '').slice(0, 500),
    }

    const membership = await checkGroupMembership(user.id)
    if (!membership.ok) {
      return res.status(400).json({
        ok: false,
        error: membership.error,
        isMember: false,
      })
    }

    if (!membership.isMember) {
      return res.status(403).json({
        ok: false,
        error: 'You must join our Telegram group before booking.',
        isMember: false,
        user,
      })
    }

    const session = createSession(user, membership, 'telegram')
    return res.json({
      ok: true,
      token: session.token,
      csrfToken: session.csrfToken,
      user: session.user,
      isMember: true,
      memberStatus: session.memberStatus,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Auth server error.' })
  }
})

app.get('/api/auth/me', async (req, res) => {
  const session = getSession(req)
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Not logged in.' })
  }

  if (session.type === 'telegram') {
    const membership = await checkGroupMembership(session.user.id)
    if (!membership.ok || !membership.isMember) {
      sessions.delete(session.token)
      return res.status(403).json({
        ok: false,
        error: 'You are not in the Telegram group anymore.',
        isMember: false,
      })
    }
    session.isMember = true
    session.memberStatus = membership.status
  }

  return res.json({
    ok: true,
    user: session.user,
    csrfToken: session.csrfToken,
    isMember: session.isMember,
    memberStatus: session.memberStatus,
  })
})

app.post('/api/auth/logout', (req, res) => {
  const session = getSession(req)
  if (session) sessions.delete(session.token)
  res.json({ ok: true })
})

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function collectAdminChatTargets(payload = {}) {
  const targets = []
  const push = (value) => {
    const chatId = String(value || '').trim()
    if (chatId && !targets.includes(chatId)) targets.push(chatId)
  }

  push(payload.notifyChatId)

  const freelancerId = String(payload.freelancerId || '').trim()
  if (freelancerId) {
    const envKey = `TELEGRAM_NOTIFY_${freelancerId}`.toUpperCase()
    push(process.env[envKey])
  }

  const username = String(payload.adminTelegram || '')
    .trim()
    .replace(/^@/, '')
  if (username) push(`@${username}`)

  return targets
}

function buildBookingMessage(booking) {
  const clientTelegram = booking.clientContact || booking.telegram || '-'
  const clientLink =
    booking.telegramId
      ? `tg://user?id=${booking.telegramId}`
      : clientTelegram.startsWith('@')
        ? `https://t.me/${clientTelegram.slice(1)}`
        : ''

  const lines = [
    `<b>New booking for ${escapeHtml(booking.freelancerName || 'you')}</b>`,
    '',
    `<b>Client:</b> ${escapeHtml(booking.clientName || '-')}`,
    `<b>Telegram:</b> ${escapeHtml(clientTelegram)}`,
  ]

  if (booking.telegramId) {
    lines.push(`<b>Telegram ID:</b> <code>${escapeHtml(booking.telegramId)}</code>`)
  }
  if (clientLink) {
    lines.push(`<b>Open chat:</b> ${escapeHtml(clientLink)}`)
  }

  lines.push(
    `<b>Project:</b> ${escapeHtml(booking.project || '-')}`,
    `<b>Preferred date:</b> ${escapeHtml(booking.date || 'Not set')}`,
    `<b>Notes:</b> ${escapeHtml(booking.notes || '-')}`,
    '',
    `<i>Sent by Project Guider bot</i>`,
  )

  return lines.join('\n')
}

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  const data = await res.json()
  return data
}

app.post('/api/bookings/notify', notifyLimiter, async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(503).json({
        ok: false,
        error: 'Bot token missing on server.',
      })
    }

    const booking = req.body || {}
    const targets = collectAdminChatTargets(booking)
    if (!targets.length) {
      return res.status(400).json({
        ok: false,
        error: 'Admin Telegram recipient missing.',
      })
    }

    const text = buildBookingMessage(booking)
    let lastError = null

    for (const chatId of targets) {
      const result = await sendTelegramMessage(chatId, text)
      if (result.ok) {
        return res.json({
          ok: true,
          deliveredTo: chatId,
          messageId: result.result?.message_id,
        })
      }
      lastError = result
    }

    return res.status(400).json({
      ok: false,
      error:
        lastError?.description ||
        'Could not message admin. Ask them to open @projectguiderlogin_bot and tap Start once.',
      telegram: lastError,
      tried: targets,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'Notify server error.' })
  }
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false }))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

function onReady() {
  console.log(`App running on port ${process.env.PORT || PORT}`)
  if (fs.existsSync(distDir)) {
    console.log(`Serving frontend from ${distDir}`)
  }
  if (!configured()) {
    console.warn(
      'Missing Telegram env. Copy .env.example → .env and fill BOT token, username, chat id.',
    )
  }
}

app.listen(PORT, onReady)

module.exports = app
