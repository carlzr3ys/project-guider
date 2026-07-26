import Avatar from './Avatar'
import { isBookable, statusClass, statusLabel } from '../utils/status'

export default function StatusBoard({ freelancers, onBook, onContact }) {
  return (
    <section id="status" className="status-section" aria-labelledby="status-title">
      <div className="section-shell">
        <div className="section-head">
          <h2 id="status-title">Admin status now</h2>
          <p>Tap Contact or Book when they are Free or Not too busy.</p>
        </div>

        <ul className="freelancer-list">
          {freelancers.map((person, index) => {
            const bookable = isBookable(person.status)
            const chip = statusClass(person.status)
            return (
              <li
                key={person.id}
                className={`freelancer-row ${chip}${bookable ? ' is-bookable' : ' is-busy-row'}`}
                style={{ '--i': index }}
              >
                <div className="freelancer-main">
                  <Avatar person={person} />
                  <div className="freelancer-copy">
                    <div className="freelancer-title-row">
                      <h3>{person.name}</h3>
                      <span className={`status-chip ${chip} status-chip-mobile`}>
                        <span className="status-dot" aria-hidden="true" />
                        {statusLabel(person.status)}
                      </span>
                    </div>
                    <p className="role">{person.role}</p>
                    {person.bio && <p className="bio">{person.bio}</p>}
                    <p className="handle">@{person.contact.telegram}</p>
                  </div>
                </div>

                <div className="freelancer-meta">
                  <span className={`status-chip ${chip} status-chip-desktop`}>
                    <span className="status-dot" aria-hidden="true" />
                    {statusLabel(person.status)}
                  </span>

                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={!bookable}
                      onClick={() => onContact(person)}
                    >
                      Contact
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!bookable}
                      onClick={() => onBook(person)}
                    >
                      Book
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
