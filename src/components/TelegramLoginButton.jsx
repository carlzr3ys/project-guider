import { useEffect, useRef } from 'react'

function TelegramIcon() {
  return (
    <span className="tg-login-icon" aria-hidden="true">
      <img src="/telegram-logo.jpg" alt="" width="22" height="22" />
    </span>
  )
}

/**
 * Custom "Login with Telegram" button with your Telegram logo.
 * Official widget sits on top (near-invisible) for real auth clicks.
 */
export default function TelegramLoginButton({
  botUsername,
  onAuth,
  onError,
  onNeedConfig,
  size = 'large',
  cornerRadius = 14,
}) {
  const containerRef = useRef(null)
  const hasBot = Boolean(botUsername)

  useEffect(() => {
    if (!hasBot || !containerRef.current) return undefined

    const callbackName = `__onTelegramAuth_${Math.random().toString(36).slice(2)}`
    window[callbackName] = (user) => {
      onAuth?.(user)
    }

    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername.replace(/^@/, ''))
    script.setAttribute('data-size', size)
    script.setAttribute('data-radius', String(cornerRadius))
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.onerror = () => onError?.('Could not load Telegram login widget.')

    containerRef.current.appendChild(script)

    return () => {
      delete window[callbackName]
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [botUsername, hasBot, onAuth, onError, size, cornerRadius])

  function handleFallbackClick() {
    if (!hasBot) {
      onNeedConfig?.()
      onError?.(
        'Telegram login is not configured yet. Add TELEGRAM_BOT_USERNAME in .env',
      )
    }
  }

  return (
    <div className={`tg-login-btn ${hasBot ? 'has-widget' : ''}`}>
      <button
        type="button"
        className="tg-login-btn-face"
        onClick={handleFallbackClick}
        tabIndex={hasBot ? -1 : 0}
      >
        <TelegramIcon />
        <span>Login with Telegram</span>
      </button>

      {hasBot && (
        <div
          className="tg-login-btn-widget"
          ref={containerRef}
          aria-label="Login with Telegram"
        />
      )}
    </div>
  )
}
