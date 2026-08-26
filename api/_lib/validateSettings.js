// Strict allow-list validator for the site_settings JSON blob. Rejects
// unknown keys and wrong types entirely — the admin settings endpoint
// never stores arbitrary/unrestricted JSON, only exactly this shape.

const STRING_FIELD_MAX = 400
const ARRAY_FIELD_MAX = 12

const PAGE_KEYS = ['services', 'approach', 'contact', 'booking', 'about']
const PAGE_SCHEMA = { eyebrow: 'string', heading1: 'string', heading2: 'string', sub: 'string', ctaLabel: 'string', prompt: 'string' }

// Mirrors src/lib/grades.js — kept as a separate constant since api/_lib
// and src/lib are built independently (same convention already used by
// api/_lib/timezone.js vs src/lib/timezone.js).
const GRADE_VALUES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const SCHEMA = {
  contact: {
    phone: 'string', phoneTel: 'string', email: 'string', donateEmail: 'string', serving: 'string', hours: 'string',
    phoneLabel: 'string', emailLabel: 'string', servingLabel: 'string', hoursLabel: 'string',
    zoomLink: { url: true },
  },
  hero: { eyebrow: 'string', line1: 'string', line2: 'string', subtext: 'string', pillPrefix: 'string', pillText: 'string', scrollLabel: 'string', imageUrl: { url: true } },
  footer: {
    tagline1: 'string', tagline2: 'string', blurb: 'string',
    communityLine: 'string', statusPillText: 'string', ctaLabel: 'string',
    aboutBlurb: 'string', servicesHeading: 'string', programHeading: 'string', contactHeading: 'string',
    donateLinkLabel: 'string', privacyLabel: 'string', termsLabel: 'string', copyrightText: 'string',
    logoUrl: { url: true },
  },
  stats: {
    sessions: 'number', freePercent: 'number', replyHours: 'number',
    sessionsLabel: 'string', freePercentLabel: 'string', replyHoursLabel: 'string',
  },
  navbar: { brandText: 'string', freeBadgeText: 'string', ctaLabel: 'string', logoUrl: { url: true } },
  donateBanner: { heading: 'string', description: 'string', ctaLabel: 'string' },
}

const ARRAY_SCHEMAS = {
  'home.featureCards': { eyebrow: 'string', heading: 'string', sub: 'string', text: 'string' },
  'approach.protocolSteps': { title: 'string', tagline: 'string', text: 'string', meta: 'string', imageUrl: { url: true } },
  'approach.trustBadges': { title: 'string', text: 'string' },
  'services.items': { title: 'string', text: 'string' },
  'navbar.navLinks': { label: 'string' },
  'booking.steps': { heading: 'string', sub: 'string' },
  'booking.stepIndicatorLabels': { label: 'string' },
  'booking.formatOptions': { label: 'string', text: 'string' },
  'about.bioParagraphs': { text: 'string' },
  'about.credentials': { title: 'string', text: 'string' },
  'footer.programLinks': { label: 'string' },
  'legal.privacyParagraphs': { text: 'string' },
  'legal.termsParagraphs': { text: 'string' },
}

const CUSTOM_BLOCK_ID_RE = /^[a-zA-Z0-9-]{1,60}$/
const CUSTOM_BLOCKS_MAX = 50
const CUSTOM_BLOCK_SCHEMA = { id: 'string', sectionId: 'string', text: 'string' }

const SIMPLE_SECTION_SCHEMAS = {
  'home.finalCta': { heading1: 'string', heading2: 'string', ctaLabel: 'string' },
  'home.featuresSection': { eyebrow: 'string', heading1: 'string', heading2: 'string' },
  'approach.trustSignalsHeading': { eyebrow: 'string', heading: 'string' },
  'booking.fieldLabels': { parentName: 'string', studentName: 'string', email: 'string', phone: 'string', notes: 'string' },
  'booking.buttonLabels': { back: 'string', continueLabel: 'string', sending: 'string', tryAgain: 'string', submit: 'string' },
  'booking.confirmation': { heading: 'string', receiptPrefix: 'string', receiptFallback: 'string', notice: 'string', donatePrompt: 'string', donateButtonLabel: 'string' },
  'booking.errors': { conflict: 'string', generic: 'string', network: 'string', unexpected: 'string' },
}

const ELEMENT_STYLE_ID_RE = /^[a-zA-Z0-9_.-]{1,120}$/
const ELEMENT_STYLE_ANIMATIONS = ['none', 'fade-in', 'slide-up', 'stagger']
const MAX_ELEMENT_STYLE_ENTRIES = 500
const FONT_SIZE_MIN = 10
const FONT_SIZE_MAX = 96
const ANIMATION_SPEED_MIN = 0.25
const ANIMATION_SPEED_MAX = 3
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const MAX_BODY_BYTES = 100_000

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

// Empty string is a valid "no image set" state. A non-empty value must be
// a plain http(s) URL — rejects javascript:/data: and anything else that
// could end up in an <img src> unexpectedly, even though React already
// doesn't execute string attribute values as script. Also accepts a
// same-origin relative path (a single leading "/", not "//" — that
// would be protocol-relative to an external host) since several image
// fields (hero.imageUrl, navbar/footer.logoUrl, etc.) default to bundled
// files under /public/images rather than an uploaded absolute URL.
function validateUrlField(value, path, errors) {
  if (typeof value !== 'string') { errors.push(`${path} must be a string.`); return null }
  const trimmed = value.trim()
  if (trimmed === '') return ''
  if (trimmed.length > STRING_FIELD_MAX) { errors.push(`${path} is too long.`); return null }
  const isAbsoluteUrl = /^https?:\/\//i.test(trimmed)
  const isRelativePath = trimmed.startsWith('/') && !trimmed.startsWith('//')
  if (!isAbsoluteUrl && !isRelativePath) {
    errors.push(`${path} must be a valid http(s) URL or a site-relative path.`)
    return null
  }
  return trimmed
}

// `type` is 'string', 'number', `{ enum: [...] }` for a fixed set of
// allowed literal values (e.g. grade labels), or `{ url: true }` for an
// image URL field — used by both `validateObjectAgainstSchema` and
// `validateSection`'s simple fields.
function validateSimpleField(value, type, path, errors) {
  if (type === 'string') return validateStringField(value, path, errors)
  if (type === 'number') return validateNumberField(value, path, errors)
  if (type && Array.isArray(type.enum)) {
    if (!type.enum.includes(value)) { errors.push(`${path} must be one of ${type.enum.join(', ')}.`); return null }
    return value
  }
  if (type && type.url) return validateUrlField(value, path, errors)
  errors.push(`${path} has an unrecognized field type.`)
  return null
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
    clean[key] = validateSimpleField(obj[key], schema[key], `${pathPrefix}.${key}`, errors)
  }
  return clean
}

// deepMerge (client and server) replaces arrays wholesale rather than
// merging element-by-element, so any patch touching an array field is
// expected to carry the complete array — validated as a whole here too.
function validateArrayField(value, itemSchema, path, errors, maxLen = ARRAY_FIELD_MAX) {
  if (!Array.isArray(value)) { errors.push(`${path} must be an array.`); return null }
  if (value.length > maxLen) { errors.push(`${path} has too many items (max ${maxLen}).`); return null }
  return value.map((item, i) => validateObjectAgainstSchema(item, itemSchema, `${path}.${i}`, errors))
}

// customBlocks is admin-authored content, not a fixed schema section — a
// plain array (replaces wholesale like every other array here, which is
// exactly what makes deleting a block a simple "resend the array minus
// one entry"), capped higher than the default since it's the one
// genuinely open-ended list of content on the site. Each id must be
// unique and safe to use as a DOM attribute value / dot-path segment.
function validateCustomBlocks(value, errors) {
  const clean = validateArrayField(value, CUSTOM_BLOCK_SCHEMA, 'customBlocks', errors, CUSTOM_BLOCKS_MAX)
  if (!clean) return clean

  const seen = new Set()
  for (let i = 0; i < clean.length; i++) {
    const block = clean[i]
    if (!block) continue
    const path = `customBlocks.${i}`
    if (typeof block.id !== 'string' || !CUSTOM_BLOCK_ID_RE.test(block.id)) {
      errors.push(`${path}.id must be a short alphanumeric/hyphen id.`)
      continue
    }
    if (seen.has(block.id)) { errors.push(`${path}.id is a duplicate: ${block.id}.`); continue }
    seen.add(block.id)
  }
  return clean
}

// A compound top-level section: some plain string/number fields, some
// array-of-object sub-fields (e.g. `navbar.navLinks`), and/or some nested
// plain-object sub-fields (e.g. `home.finalCta`). All configured fields
// are required whenever the section itself is present, same convention as
// `validateObjectAgainstSchema` for the simple sections — unknown-key
// checking spans all three categories together so a field declared as an
// array/object isn't mistakenly flagged as an unknown simple field.
function validateSection(obj, { simple = {}, arrays = {}, objects = {} }, pathPrefix, errors) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push(`${pathPrefix} must be an object.`)
    return null
  }
  const knownKeys = new Set([...Object.keys(simple), ...Object.keys(arrays), ...Object.keys(objects)])
  const unknown = Object.keys(obj).filter((k) => !knownKeys.has(k))
  if (unknown.length) errors.push(`${pathPrefix} has unknown field(s): ${unknown.join(', ')}.`)

  const clean = {}
  for (const key of Object.keys(simple)) {
    clean[key] = validateSimpleField(obj[key], simple[key], `${pathPrefix}.${key}`, errors)
  }
  for (const key of Object.keys(arrays)) {
    clean[key] = validateArrayField(obj[key], arrays[key], `${pathPrefix}.${key}`, errors)
  }
  for (const key of Object.keys(objects)) {
    clean[key] = validateObjectAgainstSchema(obj[key], objects[key], `${pathPrefix}.${key}`, errors)
  }
  return clean
}

// elementStyles is the one genuinely dynamic-keyed, partial-friendly map:
// keys are editor-generated element ids (not a fixed allow-list), and a
// single edit only ever touches one field of one id — so each entry's
// fields are validated individually and only if present, unlike every
// other section above.
function validateElementStyleEntry(value, path, errors) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${path} must be an object.`)
    return null
  }
  const allowedKeys = ['color', 'fontSize', 'animation', 'animationSpeed']
  const unknown = Object.keys(value).filter((k) => !allowedKeys.includes(k))
  if (unknown.length) errors.push(`${path} has unknown field(s): ${unknown.join(', ')}.`)

  const clean = {}
  if (value.color !== undefined) {
    if (typeof value.color !== 'string' || !HEX_COLOR_RE.test(value.color)) {
      errors.push(`${path}.color must be a hex color like #1B3A6B.`)
    } else clean.color = value.color
  }
  if (value.fontSize !== undefined) {
    const n = Number(value.fontSize)
    if (!Number.isFinite(n) || n < FONT_SIZE_MIN || n > FONT_SIZE_MAX) {
      errors.push(`${path}.fontSize must be between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}.`)
    } else clean.fontSize = n
  }
  if (value.animation !== undefined) {
    if (!ELEMENT_STYLE_ANIMATIONS.includes(value.animation)) {
      errors.push(`${path}.animation must be one of ${ELEMENT_STYLE_ANIMATIONS.join(', ')}.`)
    } else clean.animation = value.animation
  }
  if (value.animationSpeed !== undefined) {
    const n = Number(value.animationSpeed)
    if (!Number.isFinite(n) || n < ANIMATION_SPEED_MIN || n > ANIMATION_SPEED_MAX) {
      errors.push(`${path}.animationSpeed must be between ${ANIMATION_SPEED_MIN} and ${ANIMATION_SPEED_MAX}.`)
    } else clean.animationSpeed = n
  }
  return clean
}

function validateElementStyles(value, errors) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push('elementStyles must be an object.')
    return null
  }
  const ids = Object.keys(value)
  if (ids.length > MAX_ELEMENT_STYLE_ENTRIES) {
    errors.push(`elementStyles has too many entries (max ${MAX_ELEMENT_STYLE_ENTRIES}).`)
    return null
  }
  const clean = {}
  for (const id of ids) {
    if (!ELEMENT_STYLE_ID_RE.test(id)) {
      errors.push(`elementStyles has an invalid element id: ${id}.`)
      continue
    }
    clean[id] = validateElementStyleEntry(value[id], `elementStyles.${id}`, errors)
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

  const allowedTopLevel = [
    'contact', 'hero', 'pages', 'footer', 'stats',
    'navbar', 'donateBanner', 'home', 'approach', 'services', 'booking', 'about', 'legal',
    'elementStyles', 'customBlocks',
  ]
  const unknownTop = Object.keys(body).filter((k) => !allowedTopLevel.includes(k))
  if (unknownTop.length) errors.push(`Unknown top-level field(s): ${unknownTop.join(', ')}.`)

  const clean = {}

  for (const section of ['contact', 'hero', 'footer', 'stats', 'donateBanner']) {
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

  if (body.home !== undefined) {
    clean.home = validateSection(body.home, {
      simple: { heroCtaLabel: 'string' },
      arrays: { featureCards: ARRAY_SCHEMAS['home.featureCards'] },
      objects: {
        finalCta: SIMPLE_SECTION_SCHEMAS['home.finalCta'],
        featuresSection: SIMPLE_SECTION_SCHEMAS['home.featuresSection'],
      },
    }, 'home', errors)
  }

  if (body.approach !== undefined) {
    clean.approach = validateSection(body.approach, {
      simple: { protocolPillText: 'string', stepLabelPrefix: 'string', stepFooterSuffix: 'string' },
      arrays: {
        protocolSteps: ARRAY_SCHEMAS['approach.protocolSteps'],
        trustBadges: ARRAY_SCHEMAS['approach.trustBadges'],
      },
      objects: { trustSignalsHeading: SIMPLE_SECTION_SCHEMAS['approach.trustSignalsHeading'] },
    }, 'approach', errors)
  }

  if (body.services !== undefined) {
    clean.services = validateSection(body.services, {
      simple: { badgeText: 'string' },
      arrays: { items: ARRAY_SCHEMAS['services.items'] },
    }, 'services', errors)
  }

  if (body.navbar !== undefined) {
    clean.navbar = validateSection(body.navbar, {
      simple: SCHEMA.navbar,
      arrays: { navLinks: ARRAY_SCHEMAS['navbar.navLinks'] },
    }, 'navbar', errors)
  }

  if (body.legal !== undefined) {
    clean.legal = validateSection(body.legal, {
      simple: { privacyHeading: 'string', termsHeading: 'string' },
      arrays: {
        privacyParagraphs: ARRAY_SCHEMAS['legal.privacyParagraphs'],
        termsParagraphs: ARRAY_SCHEMAS['legal.termsParagraphs'],
      },
    }, 'legal', errors)
  }

  if (body.booking !== undefined) {
    clean.booking = validateSection(body.booking, {
      simple: {
        minGrade: { enum: GRADE_VALUES }, maxGrade: { enum: GRADE_VALUES },
        freeNote: 'string', openTimesPrefix: 'string', loadingTimesText: 'string', noSlotsText: 'string',
      },
      arrays: {
        steps: ARRAY_SCHEMAS['booking.steps'],
        stepIndicatorLabels: ARRAY_SCHEMAS['booking.stepIndicatorLabels'],
        formatOptions: ARRAY_SCHEMAS['booking.formatOptions'],
      },
      objects: {
        fieldLabels: SIMPLE_SECTION_SCHEMAS['booking.fieldLabels'],
        buttonLabels: SIMPLE_SECTION_SCHEMAS['booking.buttonLabels'],
        confirmation: SIMPLE_SECTION_SCHEMAS['booking.confirmation'],
        errors: SIMPLE_SECTION_SCHEMAS['booking.errors'],
      },
    }, 'booking', errors)
    if (clean.booking && clean.booking.minGrade && clean.booking.maxGrade) {
      const minIdx = GRADE_VALUES.indexOf(clean.booking.minGrade)
      const maxIdx = GRADE_VALUES.indexOf(clean.booking.maxGrade)
      if (maxIdx < minIdx) errors.push('booking.maxGrade must be at or after booking.minGrade.')
    }
  }

  if (body.about !== undefined) {
    clean.about = validateSection(body.about, {
      simple: { name: 'string', role: 'string' },
      arrays: {
        bioParagraphs: ARRAY_SCHEMAS['about.bioParagraphs'],
        credentials: ARRAY_SCHEMAS['about.credentials'],
      },
    }, 'about', errors)
  }

  if (body.elementStyles !== undefined) {
    clean.elementStyles = validateElementStyles(body.elementStyles, errors)
  }

  if (body.customBlocks !== undefined) {
    clean.customBlocks = validateCustomBlocks(body.customBlocks, errors)
  }

  return { errors, clean: errors.length ? null : clean }
}
