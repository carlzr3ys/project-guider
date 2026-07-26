function apiBase() {
  return String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

let csrfToken = ''

export function setCsrfToken(token) {
  csrfToken = token || ''
}

export function getCsrfToken() {
  return csrfToken
}

export async function loginAdmin(username, password) {
  const res = await fetch(`${apiBase()}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || 'Login failed.' }
  }
  if (data.csrfToken) {
    setCsrfToken(data.csrfToken)
  }
  return { ok: true, user: data.user, token: data.token }
}

export async function fetchFreelancers() {
  const res = await fetch(`${apiBase()}/api/freelancers`, {
    credentials: 'include',
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Could not load team status.')
  }
  return data.freelancers || []
}

export async function pushStatus({ id, status, username, password }) {
  const headers = { 'Content-Type': 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`${apiBase()}/api/freelancers/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ status, username, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Could not save status.')
  }
  return data.freelancers || []
}

export async function pushProfile({ id, updates, username, password }) {
  const headers = { 'Content-Type': 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`${apiBase()}/api/freelancers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({ updates, username, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Could not save profile.')
  }
  return data.freelancers || []
}

export async function pushTeam({ freelancers, admins, username, password }) {
  const headers = { 'Content-Type': 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`${apiBase()}/api/team`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({ freelancers, admins, username, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Could not sync team.')
  }
  return data.freelancers || []
}

export async function pushJoinRequest(payload) {
  const res = await fetch(`${apiBase()}/api/join-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || 'Could not submit request.' }
  }
  return { ok: true, request: data.request }
}

export async function fetchJoinRequests(token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${apiBase()}/api/join-requests`, {
    headers,
    credentials: 'include',
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    return []
  }
  return data.joinRequests || []
}

export async function resolveJoinRequestApi(requestId, status, credentials) {
  const headers = { 'Content-Type': 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`${apiBase()}/api/join-requests/${encodeURIComponent(requestId)}/resolve`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ status, username: credentials?.username, password: credentials?.password }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || 'Could not resolve request.' }
  }
  return { ok: true, request: data.request }
}
