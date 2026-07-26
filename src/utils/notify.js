const BASE_TITLE = 'Project Guider By Ree & Luq'

export async function ensureNotifyPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function pushBookingAlert(booking) {
  const title = `New booking for ${booking.freelancerName}`
  const body = `${booking.clientName} booked: ${booking.project}`

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([180, 80, 180])
    } catch {
      // ignore
    }
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        tag: booking.id,
        renotify: true,
        icon: '/favicon.svg',
      })
      n.onclick = () => {
        window.focus()
        window.location.hash = 'admin'
        n.close()
      }
    } catch {
      // Safari private / unsupported options
    }
  }

  return { title, body }
}

export function updateDocTitle(unreadCount) {
  document.title =
    unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE
}
