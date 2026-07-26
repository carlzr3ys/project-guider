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

const sessions = new Map()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '3mb' }))

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

function createSession(user, membership) {
  const token = crypto.randomBytes(24).toString('hex')
  const session = {
    token,
    user,
    isMember: membership.isMember,
    memberStatus: membership.status,
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

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: configured(),
    botUsername: BOT_USERNAME || null,
  })
})

// Shared status board (all visitors see the same freelancers/status)
app.get('/api/freelancers', (_req, res) => {
  res.json({
    ok: true,
    freelancers: storeApi.publicFreelancers(),
    updatedAt: storeApi.readStore().updatedAt,
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
    channelUrl: process.env.VITE_TELEGRAM_CHANNEL || 'https://t.me/+uD81UyseH_tkZGU1',
  })
})

app.post('/api/auth/telegram', async (req, res) => {
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
      firstName: payload.first_name || '',
      lastName: payload.last_name || '',
      username: payload.username || '',
      photoUrl: payload.photo_url || '',
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

    const session = createSession(user, membership)
    return res.json({
      ok: true,
      token: session.token,
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
  return res.json({
    ok: true,
    user: session.user,
    isMember: true,
    memberStatus: membership.status,
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

  // Numeric chat id is reliable; @username often returns "chat not found"
  push(payload.notifyChatId)

  const freelancerId = String(payload.freelancerId || '').trim()
  if (freelancerId) {
    const envKey = `TELEGRAM_NOTIFY_${freelancerId}`.toUpperCase()
    push(process.env[envKey] || process.env[`TELEGRAM_NOTIFY_${freelancerId}`])
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

app.post('/api/bookings/notify', async (req, res) => {
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
        error:
          'Admin Telegram username missing. Set it in Admin → Edit profile.',
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

// cPanel LiteSpeed sets PORT. Local uses API_PORT / 8787.
app.listen(PORT, onReady)

module.exports = app
