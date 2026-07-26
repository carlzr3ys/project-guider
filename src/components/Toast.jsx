export default function Toast({ message, onClose }) {
  if (!message) return null

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  )
}
