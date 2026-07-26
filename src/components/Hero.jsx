import { BRAND } from '../data'

export default function Hero({ anyoneAvailable, onScrollToTeam }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-inner">
        <div className="brand-hero-wrap">
          <p className="brand-hero">{BRAND.name}</p>
          <p className="brand-hero-sub">{BRAND.tagline}</p>
        </div>
        <h1 id="hero-title">See who is free to guide your project.</h1>
        <p className="hero-sub">
          Stuck on coding? Check admin status — Free or Not too busy means you can
          contact or book a slot.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={onScrollToTeam}>
            View status
          </button>
          <span className={`live-pill ${anyoneAvailable ? 'is-free' : 'is-busy'}`}>
            <span className="live-dot" aria-hidden="true" />
            {anyoneAvailable ? 'Admin available' : 'Everyone is busy'}
          </span>
        </div>
      </div>
    </section>
  )
}
