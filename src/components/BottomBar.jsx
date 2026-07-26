export default function BottomBar({ anyoneAvailable, onBook }) {
  return (
    <div className="bottom-bar" role="region" aria-label="Quick booking">
      <div className="bottom-bar-inner">
        <div className="bottom-status">
          <span className={`status-chip ${anyoneAvailable ? 'free' : 'busy'}`}>
            <span className="status-dot" aria-hidden="true" />
            {anyoneAvailable ? 'Booking open' : 'Booking closed'}
          </span>
          <p>
            {anyoneAvailable
              ? 'Someone is free to guide you now.'
              : 'All admins are busy — check back soon.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-book"
          disabled={!anyoneAvailable}
          onClick={onBook}
        >
          Book now
        </button>
      </div>
    </div>
  )
}
