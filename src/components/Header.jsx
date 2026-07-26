import { BRAND } from '../data'

export default function Header({
  view,
  onNavigate,
  unreadCount,
  isAdminLoggedIn,
  telegramUser,
  telegramDisplayName,
  onTelegramLogout,
}) {
  return (
    <header className="site-header">
      <a
        href="#home"
        className="brand"
        onClick={(e) => {
          e.preventDefault()
          onNavigate('home')
        }}
      >
        <span className="brand-text">
          <span className="brand-name">{BRAND.name}</span>
          <span className="brand-tag">{BRAND.tagline}</span>
        </span>
      </a>

      <nav className="nav" aria-label="Main">
        {telegramUser ? (
          <div className="tg-user-chip" title="Logged in with Telegram">
            {telegramUser.photoUrl ? (
              <img src={telegramUser.photoUrl} alt="" />
            ) : null}
            <span>{telegramDisplayName}</span>
            <button type="button" className="text-btn" onClick={onTelegramLogout}>
              Out
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className={view === 'home' ? 'nav-link active' : 'nav-link'}
          onClick={() => onNavigate('home')}
        >
          Status
        </button>
        <button
          type="button"
          className={view === 'admin' ? 'nav-link active' : 'nav-link'}
          onClick={() => onNavigate('admin')}
        >
          Admin
          {isAdminLoggedIn && unreadCount > 0 && (
            <span className="nav-badge" aria-label={`${unreadCount} new notifications`}>
              {unreadCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  )
}
