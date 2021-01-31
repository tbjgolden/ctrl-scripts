import fs from 'fs'
import path from 'path'
import { prompt } from 'enquirer'
import fg from 'fast-glob'
import dedent from 'dedent'
import del from 'del'
import { mutatePackageJSON } from './utils'

const trimObject = (
  obj: Record<string, string | null | undefined>
): Record<string, string> => {
  return Object.entries(obj).reduce((o, [k, v]) => {
    o[k] = ((v || '') as string).trim()
    return o
  }, {} as Record<string, string>)
}

const guessGithubUsername = (): string => {
  // Guess username from nearby package.json files
  const files = fg
    .sync('../../../**/!(node_modules)/*/package.json', {
      dot: true,
      suppressErrors: true
    })
    .filter((x) => !x.includes('node_modules'))
    .slice(0, 50)
    .map((x) => {
      let json = null
      try {
        json = JSON.parse(fs.readFileSync(x, 'utf8'))?.repository?.url
      } catch {}

      if (typeof json === 'string') {
        const matchResults = json.match(usernameRegex)
        if (matchResults) {
          return matchResults[1]
        }
      }

      return null
    })
    .filter(Boolean)
    .reduce((map, _s) => {
      const s = _s as string
      map.set(s, (map.get(s) ?? 0) + 1)
      return map
    }, new Map<string, number>())

  let max = ''
  let maxCount = -1
  for (const [username, count] of files.entries()) {
    if (count > maxCount) {
      maxCount = count
      max = username
    }
  }

  return max
}

const usernameRegex = /github\.com[:\/]([^\/]*)/

const setup = async () => {
  const initialProjectLoc = path.join(__dirname, '..').split(path.sep)
  const initialProjectDir = initialProjectLoc[initialProjectLoc.length - 1]

  const {
    meta: {
      projectName,
      projectDescription,
      githubUsername,
      authorName,
      authorEmail
    }
  } = await prompt<{
    meta: {
      projectName: string
      projectDescription: string
      githubUsername: string
      authorName: string
      authorEmail: string
    }
  }>({
    type: 'snippet',
    name: 'meta',
    message: 'Fill out the fields in package.json',
    template:
      dedent(`{
        "name": "\${projectName${
          initialProjectDir === 'create-typescript-react-library'
            ? ''
            : `:${initialProjectDir}`
        }}",
        "description": "\${projectDescription}",
        "homepage": "https://github.com/\${githubUsername:${guessGithubUsername()}}/\${projectName}",
        "author": {
          "name": "\${authorName}",
          "email": "\${authorEmail}",
          "url": "https://github.com/\${githubUsername}"
        },
        "repository": {
          "type": "git",
          "url": "https://github.com/\${githubUsername}/\${projectName}.git"
        }
      }`) + '\n',
    result: ((o: { values: Record<string, string | undefined> }) =>
      trimObject(o.values)) as any,
    validate: ((_: any, state: any): string | boolean => {
      const values = trimObject(state.value.values)
      if (!/^[a-z0-9-~][a-z0-9-._~]*$/.test(values.projectName)) {
        return 'project name is invalid'
      }
      if (
        !/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(values.githubUsername)
      ) {
        return 'github username is invalid'
      }
      if (values.authorName.length === 0) {
        return 'author name is invalid'
      }
      if (
        !/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/.test(
          values.authorEmail
        )
      ) {
        return 'author email is invalid'
      }
      return true
    }) as any
  })

  const {
    meta: { variableName }
  } = await prompt<{
    meta: { variableName: string }
  }>({
    type: 'snippet',
    name: 'meta',
    message: 'What variable should your library be exported as?',
    template:
      dedent(
        '\n' +
          `
      // Default import name (for basic usage example)
      import \${variableName:${
        projectName
          .split(/[_\-]/g)
          .reduce(
            (s: string, x: string) =>
              `${s}${x.length > 0 ? `${x[0].toUpperCase()}${x.slice(1)}` : ''}`,
            ''
          ) ?? 'VariableName'
      }} from '${projectName}'

      // Window global name (for use in a web browser)
      window.\${variableName}.foo(bar)
      `
      ) + '\n',
    result: ((o: { values: Record<string, string | undefined> }) =>
      trimObject(o.values)) as any,
    validate: ((_: any, state: any): string | boolean => {
      const values = trimObject(state.value.values)

      try {
        new Function(values.variableName, 'var ' + values.variableName)
      } catch {
        return 'variable name is invalid'
      }

      return true
    }) as any
  })

  const year = `${new Date().getFullYear()}`

  const mapper = {
    'ctrl-scripts': projectName,
    'CTRLScripts': variableName,
    'tbjgolden': githubUsername,
    'Tom Golden': authorName,
    'github@tbjgolden.com': authorEmail,
    'Scripts for create-typescript-react-library': projectDescription,
    '2021': year
  }

  const replacerRegex = new RegExp(
    Object.keys(mapper)
      .map((key) => key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
      .join('|'),
    'g'
  )

  const { confirm } = await prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: dedent(
      `Do these look right?

      Project Name:        ${JSON.stringify(projectName)}
      Variable Name:       ${JSON.stringify(variableName)}
      Github Username:     ${JSON.stringify(githubUsername)}
      Author Name:         ${JSON.stringify(authorName)}
      Author Email:        ${
        authorEmail ? JSON.stringify(authorEmail) : '(Field will be removed)'
      }
      Project Description: ${JSON.stringify(projectDescription)}

      IMPORTANT: you can only run this once and there's no undo!`
    )
  })

  if (!confirm) {
    console.log('\nSetup cancelled.')
    process.exit(0)
  }

  console.log('Replacing starter readme with library readme')
  fs.writeFileSync(
    path.join(__dirname, '../README.md'),
    dedent(
      `
      # \`ctrl-scripts\`

      [![npm version](https://img.shields.io/npm/v/ctrl-scripts.svg?style=flat-square)](https://www.npmjs.com/package/ctrl-scripts)
      [![test coverage](https://img.shields.io/badge/dynamic/json?style=flat-square&color=brightgreen&label=coverage&query=%24.total.branches.pct&suffix=%25&url=https%3A%2F%2Funpkg.com%2F${encodeURIComponent(
        projectName
      )}%2Fcoverage%2Fcoverage-summary.json)](https://www.npmjs.com/package/ctrl-scripts)
      [![GitHub Workflow Status](https://img.shields.io/github/workflow/status/tbjgolden/ctrl-scripts/Release?style=flat-square)](https://github.com/tbjgolden/ctrl-scripts/actions?query=workflow%3ARelease)

      ${
        projectDescription
          ? `> **${projectDescription.replace(
              /[!"#$%&'()*+,./:;<=>?@\-\[\\\]\^\_\`\{\|\}\~]/g,
              '\\$&'
            )}**`
          : ''
      }

      ## Installation

      \`\`\`sh
      npm install ctrl-scripts --save
      # yarn add ctrl-scripts
      \`\`\`

      Alternatively, there are also client web builds available:

      <!-- IMPORTANT: Do not delete or change the comments in the code block below -->

      \`\`\`html
      <!-- Dependencies -->

      <!-- window.CTRLScripts -->
      <script src="https://unpkg.com/ctrl-scripts/dist/ctrl-scripts.umd.js"></script>
      \`\`\`

      ## Documentation

      - [\`Docs\`](docs)
      - [\`API\`](docs/api)

      ## License

      MIT

      <!-- Original starter readme: https://github.com/tbjgolden/create-typescript-react-library -->
      ` + '\n'
    )
  )

  console.log('Starting find and replace')
  const blacklist = new Set(
    'build|compiled|coverage|dist|node_modules|.git'.split('|')
  )

  const walkSync = (
    dir: string,
    callback: (filepath: string, stats: fs.Stats) => void
  ): void => {
    const files = fs.readdirSync(dir)
    files.forEach((file) => {
      if (!blacklist.has(file)) {
        const filepath = path.join(dir, file)
        const stats = fs.statSync(filepath)
        if (stats.isDirectory()) {
          walkSync(filepath, callback)
        } else if (stats.isFile() && !blacklist.has(file)) {
          callback(filepath, stats)
        }
      }
    })
  }

  const files: string[] = []
  walkSync(path.join(__dirname, '..'), (filepath, stats) => {
    if (stats.size < 50000) {
      files.push(filepath)
    }
  })

  const results = (
    await Promise.all(
      files.map(
        async (file): Promise<string | null> => {
          return new Promise<string | null>((resolve, reject) => {
            fs.readFile(file, { encoding: 'utf8' }, (err, str) => {
              if (err) return reject(err)
              fs.writeFile(
                file,
                str.replace(
                  replacerRegex,
                  (str: string): string => mapper[str as keyof typeof mapper]
                ),
                (err) => {
                  if (err) return reject(err)
                  resolve(null)
                }
              )
            })
          }).catch(() => file)
        }
      )
    )
  ).filter((result) => result !== null) as string[]

  if (results.length > 0) {
    console.log('Could not find and replace in files:')
    results.forEach((file: string) => {
      console.log(` - "${path.relative(path.join(__dirname, '..'), file)}"`)
    })
  }
  console.log('Finished find and replace')

  await mutatePackageJSON({
    author: {
      name: authorName,
      ...(authorEmail ? { email: authorEmail } : {}),
      url: `https://github.com/${githubUsername}`
    }
  })
  console.log('Updated package.json')

  await del(path.join(__dirname, '../config/meta'))
  console.log('Removed create-typescript-react-library logic')
}

if (require.main === module) {
  setup()
}
