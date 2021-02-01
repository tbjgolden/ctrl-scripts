import { addComponent, addReact, setup, start } from '.'

const _exports = {
  'add-component': addComponent,
  'add-react': addReact,
  setup,
  start
}

if (require.main === module) {
  ;(async () => {
    const [method, ...rest] = process.argv.slice(2)

    if (method && method in _exports) {
      const fn = _exports[method as keyof typeof _exports]
      if (fn !== undefined) {
        const result = await Promise.resolve(fn(...rest))
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
      console.log(
        `Valid commands:\n${Object.keys(_exports)
          .sort()
          .map((k) => ` - ${k}`)
          .join('\n')}`
      )
    }
  })()
} else {
  console.log('This script is not meant to be run directly. Use:')
  console.log("  import ... from 'ctrl-scripts'")
  console.log('instead')
  process.exit(1)
}
