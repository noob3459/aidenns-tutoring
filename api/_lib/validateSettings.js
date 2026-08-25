// Strict allow-list validator for the site_settings JSON blob. Rejects
// unknown keys and wrong types entirely — the admin settings endpoint
// never stores arbitrary/unrestricted JSON, only exactly this shape.

const STRING_FIELD_MAX = 400

const PAGE_KEYS = ['services', 'approach', 'contact', 'booking']
const PAGE_SCHEMA = { eyebrow: 'string', heading1: 'string', heading2: 'string', sub: 'string' }

const SCHEMA = {
  contact: { phone: 'string', phoneTel: 'string', email: 'string', donateEmail: 'string', serving: 'string', hours: 'string' },
  hero: { eyebrow: 'string', line1: 'string', line2: 'string', subtext: 'string' },
  footer: { tagline1: 'string', tagline2: 'string', blurb: 'string' },
  stats: { sessions: 'number', freePercent: 'number', replyHours: 'number' },
}

const MAX_BODY_BYTES = 20_000

function validateStringField(value, path, errors) {
  if (typeof value !== 'string') { errors.push(`${path} must be a string.`); return null }
  const trimmed = value.trim()
  if (trimmed.length > STRING_FIELD_MAX) { errors.push(`${path} is too long.`); return null }
  return trimmed
}

function validateNumberField(value, path, errors) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) { errors.push(`${path} must be a valid number.`); return null }
  return n
}

function validateObjectAgainstSchema(obj, schema, pathPrefix, errors) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push(`${pathPrefix} must be an object.`)
    return null
  }
  const unknown = Object.keys(obj).filter((k) => !(k in schema))
  if (unknown.length) errors.push(`${pathPrefix} has unknown field(s): ${unknown.join(', ')}.`)

  const clean = {}
  for (const key of Object.keys(schema)) {
    const path = `${pathPrefix}.${key}`
    const type = schema[key]
    const value = obj[key]
    if (type === 'string') clean[key] = validateStringField(value, path, errors)
    else if (type === 'number') clean[key] = validateNumberField(value, path, errors)
  }
  return clean
}

export function validateSettings(body, rawBodyLength) {
  const errors = []

  if (typeof rawBodyLength === 'number' && rawBodyLength > MAX_BODY_BYTES) {
    return { errors: ['Request body is too large.'], clean: null }
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { errors: ['Request body must be an object.'], clean: null }
  }

  const allowedTopLevel = ['contact', 'hero', 'pages', 'footer', 'stats']
  const unknownTop = Object.keys(body).filter((k) => !allowedTopLevel.includes(k))
  if (unknownTop.length) errors.push(`Unknown top-level field(s): ${unknownTop.join(', ')}.`)

  const clean = {}

  for (const section of ['contact', 'hero', 'footer', 'stats']) {
    if (body[section] !== undefined) {
      clean[section] = validateObjectAgainstSchema(body[section], SCHEMA[section], section, errors)
    }
  }

  if (body.pages !== undefined) {
    if (typeof body.pages !== 'object' || body.pages === null || Array.isArray(body.pages)) {
      errors.push('pages must be an object.')
    } else {
      const unknownPages = Object.keys(body.pages).filter((k) => !PAGE_KEYS.includes(k))
      if (unknownPages.length) errors.push(`pages has unknown key(s): ${unknownPages.join(', ')}.`)
      clean.pages = {}
      for (const key of PAGE_KEYS) {
        if (body.pages[key] !== undefined) {
          clean.pages[key] = validateObjectAgainstSchema(body.pages[key], PAGE_SCHEMA, `pages.${key}`, errors)
        }
      }
    }
  }

  return { errors, clean: errors.length ? null : clean }
}
