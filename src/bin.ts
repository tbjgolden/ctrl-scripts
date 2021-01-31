import * as methods from '.'

if (require.main === module) {
  const fns = Object.entries(methods).filter(([, v]) => typeof v === 'function')
  const fnsMap = new Map<string, (...args: any[]) => any>()
  for (const [k, fn] of fns) {
    fnsMap.set(k, fn)
  }

  const [method, ...rest] = process.argv.slice(2)

  if (method && fnsMap.has(method)) {
    const fn = fnsMap.get(method)
    if (fn !== undefined) {
      const result = fn(...rest)
      if (result !== undefined) {
        console.log(JSON.stringify(result))
      }
    }
  } else {
    console.log(
      `Invalid command ${
        method === undefined ? 'undefined' : JSON.stringify(method)
      } in \`ctrl <command> ...\``
    )
    console.log(`Valid commands:\n${fns.map(([k]) => ` - ${k}`).join('\n')}`)
  }
} else {
  console.log('This script is not meant to be run directly. Use:')
  console.log("  import ... from 'ctrl-scripts'")
  console.log('instead')
  process.exit(1)
}
