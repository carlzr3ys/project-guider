import { useCallback, useEffect, useState } from 'react'
import {
  displayName,
  fetchAuthConfig,
  loginWithTelegram,
  logoutTelegram,
  readTelegramSession,
  refreshTelegramSession,
} from '../auth/telegramAuth'

export function useTelegramAuth() {
  const [user, setUser] = useState(() => readTelegramSession()?.user || null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({
    configured: false,
    botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
    channelUrl: import.meta.env.VITE_TELEGRAM_CHANNEL || '',
  })

  useEffect(() => {
    let alive = true

    async function boot() {
      try {
        const cfg = await fetchAuthConfig()
        if (alive && cfg) {
          setConfig({
            configured: Boolean(cfg.configured),
            botUsername: cfg.botUsername || import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
            channelUrl:
              cfg.channelUrl ||
              import.meta.env.VITE_TELEGRAM_CHANNEL ||
              'https://t.me/+uD81UyseH_tkZGU1',
          })
        }
      } catch {
        // API may be offline during first load
      }

      try {
        const session = await refreshTelegramSession()
        if (alive) setUser(session?.user || null)
      } catch {
        if (alive) setUser(null)
      } finally {
        if (alive) setLoading(false)
      }
    }

    boot()
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (telegramPayload) => {
    const result = await loginWithTelegram(telegramPayload)
    if (result.ok) setUser(result.user)
    else setUser(null)
    return result
  }, [])

  const logout = useCallback(async () => {
    await logoutTelegram()
    setUser(null)
  }, [])

  return {
    user,
    loading,
    config,
    isLoggedIn: Boolean(user),
    displayName: displayName(user),
    login,
    logout,
  }
}
