export const STATUS = {
  free: 'free',
  chill: 'chill',
  busy: 'busy',
}

export const STATUS_OPTIONS = [
  { value: STATUS.free, label: 'Free', short: 'Free' },
  { value: STATUS.chill, label: 'Not too busy', short: 'Not too busy' },
  { value: STATUS.busy, label: 'Busy', short: 'Busy' },
]

export function normalizeStatus(value) {
  if (value === STATUS.busy) return STATUS.busy
  if (value === STATUS.chill || value === 'not_too_busy' || value === 'moderate') {
    return STATUS.chill
  }
  return STATUS.free
}

export function statusLabel(value) {
  const status = normalizeStatus(value)
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || 'Free'
}

export function isBookable(value) {
  const status = normalizeStatus(value)
  return status === STATUS.free || status === STATUS.chill
}

export function statusClass(value) {
  return normalizeStatus(value)
}
