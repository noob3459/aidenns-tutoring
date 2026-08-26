// Dot-path helpers for reading/writing into the SiteConfig tree, used by
// the Visual Editor to turn a single element's text edit into a full
// top-level-section patch. `updateConfig`'s deepMerge replaces arrays
// wholesale (never merges them element-by-element), so writing to any
// array-indexed path (e.g. "home.featureCards.0.heading") must return the
// COMPLETE top-level section, not just the changed leaf.

function cloneDeep(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function toKey(segment) {
  return /^\d+$/.test(segment) ? Number(segment) : segment
}

export function getAtPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[toKey(key)]), obj)
}

// Returns a patch shaped `{ [topLevelKey]: <full cloned+modified subtree> }`
// — safe to pass straight to `updateConfig`/`applyLocalPatch`.
export function setAtPath(config, path, value) {
  const keys = path.split('.')
  const topKey = keys[0]
  const clone = cloneDeep(config[topKey])

  if (keys.length === 1) return { [topKey]: value }

  let cursor = clone
  for (let i = 1; i < keys.length - 1; i++) {
    cursor = cursor[toKey(keys[i])]
  }
  cursor[toKey(keys[keys.length - 1])] = value
  return { [topKey]: clone }
}
