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
  const res = await fetch(`${apiBase()}/api/freelancers/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${apiBase()}/api/freelancers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${apiBase()}/api/team`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ freelancers, admins, username, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Could not sync team.')
  }
  return data.freelancers || []
}
