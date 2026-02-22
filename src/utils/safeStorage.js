/**
 * Safe localStorage wrapper — validates JSON structure on read
 * to prevent corrupted/tampered data from crashing the app.
 */

export function safeGetJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed
  } catch {
    // Corrupted data — remove it and return fallback
    localStorage.removeItem(key)
    return fallback
  }
}

export function safeGetUser() {
  const user = safeGetJSON('vpt-user')
  if (!user || typeof user !== 'object') return null
  // Validate shape — must have name, email, role as strings
  if (typeof user.name !== 'string' || typeof user.email !== 'string' || typeof user.role !== 'string') {
    localStorage.removeItem('vpt-user')
    return null
  }
  // Sanitize values
  return {
    name: user.name.slice(0, 100).trim(),
    email: user.email.slice(0, 200).trim().toLowerCase(),
    role: user.role.slice(0, 50).trim(),
  }
}
