export default function Avatar({ person, className = 'avatar', size }) {
  const style = size ? { width: size, height: size } : undefined
  const initials =
    person.avatar ||
    person.name
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    '?'

  if (person.photoUrl) {
    return (
      <img
        src={person.photoUrl}
        alt={person.name}
        className={`${className} avatar-photo`}
        style={style}
      />
    )
  }

  return (
    <div className={className} style={style} aria-hidden="true">
      {initials}
    </div>
  )
}
