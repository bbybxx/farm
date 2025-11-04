// Development-only logging utility
// In production, this file overrides console methods to prevent any logging

const isDev = import.meta.env.DEV

export const devLog = (...args) => {
  if (isDev) console.log(...args)
}

export const devWarn = (...args) => {
  if (isDev) console.warn(...args)
}

export const devError = (...args) => {
  if (isDev) console.error(...args)
}

// In production, silence ALL console output globally
if (!isDev) {
  const noop = () => {}
  console.log = noop
  console.warn = noop
  console.error = noop
  console.info = noop
  console.debug = noop
}
