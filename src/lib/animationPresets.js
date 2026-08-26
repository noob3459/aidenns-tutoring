import { gsap } from 'gsap'

// Small, fixed registry of entrance-animation presets, so the Visual
// Editor can offer a `<select>` of named options instead of exposing raw
// GSAP tween config. `speed` scales duration (1 = normal, 2 = twice as
// fast, 0.5 = half speed) — matches the `animationSpeed` range enforced
// by api/_lib/validateSettings.js (0.25–3).
const BASE_DURATION = 0.8

function durationFor(speed) {
  const s = Number(speed) > 0 ? Number(speed) : 1
  return BASE_DURATION / s
}

export const ANIMATION_PRESET_NAMES = ['none', 'fade-in', 'slide-up', 'stagger']

export const ANIMATION_PRESET_LABELS = {
  none: 'None',
  'fade-in': 'Fade In',
  'slide-up': 'Slide Up',
  stagger: 'Stagger',
}

function withTrigger(vars, scrollTrigger) {
  return scrollTrigger ? { ...vars, scrollTrigger } : vars
}

export const ANIMATION_PRESETS = {
  none(targets) {
    gsap.set(targets, { clearProps: 'all' })
    return null
  },
  'fade-in'(targets, { speed = 1, scrollTrigger, delay = 0 } = {}) {
    return gsap.from(targets, withTrigger(
      { opacity: 0, duration: durationFor(speed), ease: 'power3.out', delay },
      scrollTrigger
    ))
  },
  'slide-up'(targets, { speed = 1, scrollTrigger, delay = 0, distance = 30 } = {}) {
    return gsap.from(targets, withTrigger(
      { y: distance, opacity: 0, duration: durationFor(speed), ease: 'power3.out', delay },
      scrollTrigger
    ))
  },
  stagger(targets, { speed = 1, scrollTrigger, delay = 0, distance = 40, stagger = 0.12 } = {}) {
    return gsap.from(targets, withTrigger(
      { y: distance, opacity: 0, duration: durationFor(speed), ease: 'power3.out', delay, stagger },
      scrollTrigger
    ))
  },
}

// `preset` is untrusted-ish (comes from admin-configured elementStyles);
// always fall back to a safe default rather than throwing on a stale/bad
// value.
export function runAnimationPreset(preset, targets, options) {
  const fn = ANIMATION_PRESETS[preset] || ANIMATION_PRESETS['fade-in']
  return fn(targets, options)
}
