export const id = (prefix = 'init'): string =>
  `${prefix}-${Math.random().toString().slice(2)}`
