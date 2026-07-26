import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseKey(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function buildCells(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    cells.push({
      date,
      key: toKey(date),
      inMonth: date.getMonth() === month,
    })
  }
  return cells
}

function decadeStart(year) {
  return Math.floor(year / 12) * 12
}

export default function DatePicker({
  label = 'Preferred date',
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('days') // days | months | years
  const [viewDate, setViewDate] = useState(() => parseKey(value) || new Date())
  const [slide, setSlide] = useState('in')
  const [panelStyle, setPanelStyle] = useState({})
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const selected = parseKey(value)
  const cells = useMemo(() => buildCells(viewDate), [viewDate])
  const todayKey = toKey(new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const yearsStart = decadeStart(year)
  const years = Array.from({ length: 12 }, (_, i) => yearsStart + i)

  function updatePanelPosition() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(320, Math.max(rect.width, 280))
    const left = Math.min(rect.left, window.innerWidth - width - 12)
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 380 && rect.top > spaceBelow
    setPanelStyle({
      position: 'fixed',
      left: Math.max(12, left),
      width,
      top: openUp ? 'auto' : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : 'auto',
      zIndex: 80,
    })
  }

  useEffect(() => {
    if (value) {
      const parsed = parseKey(value)
      if (parsed) setViewDate(parsed)
    }
  }, [value])

  useEffect(() => {
    if (!open) setMode('days')
  }, [open])

  useLayoutEffect(() => {
    if (!open) return undefined
    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [open, mode])

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        if (mode !== 'days') setMode('days')
        else setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, mode])

  function shift(delta) {
    setSlide(delta > 0 ? 'left' : 'right')
    setViewDate((prev) => {
      if (mode === 'years') {
        return new Date(prev.getFullYear() + delta * 12, prev.getMonth(), 1)
      }
      if (mode === 'months') {
        return new Date(prev.getFullYear() + delta, prev.getMonth(), 1)
      }
      return new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    })
  }

  function headerLabel() {
    if (mode === 'years') return `${yearsStart} – ${yearsStart + 11}`
    if (mode === 'months') return String(year)
    return `${MONTHS[month]} ${year}`
  }

  function onHeaderClick() {
    if (mode === 'days') setMode('months')
    else if (mode === 'months') setMode('years')
  }

  const display = selected
    ? selected.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Pick a date'

  return (
    <div className="custom-field" ref={rootRef}>
      <span className="custom-field-label">{label}</span>
      <div className={`date-picker ${open ? 'is-open' : ''}`}>
        <button
          ref={triggerRef}
          type="button"
          className="select-trigger date-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="select-trigger-text">{display}</span>
          <span className={`select-chevron ${open ? 'up' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <div
            className="date-panel"
            role="dialog"
            aria-label="Choose a date"
            style={panelStyle}
          >
            <div className="date-panel-head">
              <button
                type="button"
                className="date-title-btn"
                onClick={onHeaderClick}
                aria-label={
                  mode === 'days'
                    ? 'Choose month and year'
                    : mode === 'months'
                      ? 'Choose year'
                      : 'Year range'
                }
              >
                <span>{headerLabel()}</span>
                {mode !== 'years' && <span className="date-title-chevron">▾</span>}
              </button>
              <div className="date-nav">
                <button
                  type="button"
                  className="date-nav-btn"
                  onClick={() => shift(-1)}
                  aria-label={mode === 'years' ? 'Previous years' : mode === 'months' ? 'Previous year' : 'Previous month'}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="date-nav-btn"
                  onClick={() => shift(1)}
                  aria-label={mode === 'years' ? 'Next years' : mode === 'months' ? 'Next year' : 'Next month'}
                >
                  ›
                </button>
              </div>
            </div>

            {mode === 'days' && (
              <>
                <div className="date-weekdays">
                  {WEEKDAYS.map((day, i) => (
                    <span key={`${day}-${i}`}>{day}</span>
                  ))}
                </div>
                <div
                  className={`date-grid slide-${slide}`}
                  key={`days-${year}-${month}`}
                  onAnimationEnd={() => setSlide('in')}
                >
                  {cells.map((cell) => {
                    const isSelected = value === cell.key
                    const isToday = cell.key === todayKey
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        className={[
                          'date-cell',
                          cell.inMonth ? 'in-month' : 'out-month',
                          isSelected ? 'is-selected' : '',
                          isToday ? 'is-today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          onChange(cell.key)
                          setOpen(false)
                          setMode('days')
                        }}
                      >
                        {cell.date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {mode === 'months' && (
              <div
                className={`date-picker-grid slide-${slide}`}
                key={`months-${year}`}
                onAnimationEnd={() => setSlide('in')}
              >
                {MONTHS.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    className={`date-pick-cell ${index === month ? 'is-selected' : ''}`}
                    onClick={() => {
                      setViewDate(new Date(year, index, 1))
                      setMode('days')
                      setSlide('in')
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {mode === 'years' && (
              <div
                className={`date-picker-grid slide-${slide}`}
                key={`years-${yearsStart}`}
                onAnimationEnd={() => setSlide('in')}
              >
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`date-pick-cell ${y === year ? 'is-selected' : ''}`}
                    onClick={() => {
                      setViewDate(new Date(y, month, 1))
                      setMode('months')
                      setSlide('in')
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            <div className="date-panel-foot">
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                  setMode('days')
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  const now = new Date()
                  onChange(toKey(now))
                  setViewDate(now)
                  setMode('days')
                  setOpen(false)
                }}
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
