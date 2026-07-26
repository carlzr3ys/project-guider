import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

export default function SelectDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  tone = '',
  placeholder = 'Select…',
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)

  function updateMenuPosition() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 220 && rect.top > spaceBelow
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: openUp ? 'auto' : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : 'auto',
      zIndex: 80,
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }

    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div
      className={`custom-field ${label ? '' : 'custom-field-bare'} ${className}`}
      ref={rootRef}
    >
      {label && <span className="custom-field-label">{label}</span>}
      <div
        className={`select-dropdown ${tone} ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
      >
        <button
          ref={triggerRef}
          type="button"
          className="select-trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="select-trigger-text">
            {selected?.label || placeholder}
          </span>
          <span className={`select-chevron ${open ? 'up' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <ul
            id={listId}
            className="select-menu"
            role="listbox"
            style={menuStyle}
          >
            {options.map((option, index) => {
              const active = option.value === value
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={active}
                  style={{ '--opt-i': index }}
                >
                  <button
                    type="button"
                    className={`select-option ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
