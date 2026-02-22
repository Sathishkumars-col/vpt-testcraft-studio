/**
 * Input sanitization utilities to prevent XSS.
 * 
 * React's JSX auto-escapes text content, but these are defense-in-depth
 * for any user input that flows into state, localStorage, or attributes.
 */

// Strip HTML tags entirely — use for plain-text fields like tags, comments, annotations
export function stripHtml(input) {
  if (typeof input !== 'string') return ''
  return input.replace(/<[^>]*>/g, '').trim()
}

// Escape HTML entities — use when you need to preserve the text but neutralize HTML
export function escapeHtml(input) {
  if (typeof input !== 'string') return ''
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' }
  return input.replace(/[&<>"'/]/g, c => map[c])
}

// Sanitize a tag name — lowercase, alphanumeric + hyphens only, max 50 chars
export function sanitizeTag(input) {
  if (typeof input !== 'string') return ''
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
}

// Sanitize a comment/annotation — strip HTML, limit length
export function sanitizeComment(input, maxLength = 500) {
  if (typeof input !== 'string') return ''
  return stripHtml(input).slice(0, maxLength)
}

// Validate and sanitize a URL — only allow http/https protocols
export function sanitizeUrl(input) {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

// Sanitize a Jira ticket ID — strict format only
export function sanitizeJiraId(input) {
  if (typeof input !== 'string') return ''
  const match = input.trim().toUpperCase().match(/^[A-Z][A-Z0-9]+-\d+$/)
  return match ? match[0] : ''
}
