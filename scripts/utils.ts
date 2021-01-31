import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import { spawn } from 'child_process'
import prettier from 'prettier'

export type State = {
  lastSync: number
  hasAddedReact: boolean
}

const defaults: State = {
  lastSync: 0,
  hasAddedReact: false
}

const projectRoot = path.join(__dirname, '..')

const configPath = path.join(projectRoot, 'config')
const stateFilePath = path.join(configPath, '.state.json')

export class PersistentState {
  _state: State

  constructor() {
    let _state: Partial<State> | null = null
    try {
      _state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8')) ?? null
    } catch {}
    this._state = {
      ...defaults,
      ...(_state ?? {})
    }
    this.write()
  }

  write(): void {
    mkdirp.sync(configPath)
    fs.writeFileSync(stateFilePath, JSON.stringify(this._state))
  }

  get(): State {
    return this._state
  }

  set(change: Partial<State>): void {
    for (const _key in change) {
      const key = _key as keyof State
      const val = change[key]
      if (val !== undefined) {
        this._state = {
          ...this._state,
          ...change
        }
      }
    }
    this.write()
  }
}

const readmeFilePath = path.join(projectRoot, 'README.md')
const codeRegex = /<!-- ?Dependencies ?-->([\s\S]*?)(?:<!--)/i
const scriptsRegex = / src="([^"]*)"/g

export const addScriptDependency = (...scripts: string[]): void => {
  for (const script of scripts) {
    const readme = fs.readFileSync(readmeFilePath, 'utf8')
    const readmeMatch = readme.match(codeRegex)
    if (readmeMatch === null) {
      if (readme.includes('create-typescript-react-library')) {
        console.error(
          `Cannot fix readme - the setup script needs to be run first`
        )
        process.exit(69)
      }
      return
    } else {
      const index = readmeMatch.index as number
      const prevScriptsHTML = readmeMatch[1]
      const prevScripts = [
        ...(prevScriptsHTML.match(scriptsRegex) ?? [])
      ].map((tag) => tag.slice(6, -1))
      if (prevScripts.indexOf(script) === -1) {
        const trimmedHTML = prevScriptsHTML.trim()
        fs.writeFileSync(
          readmeFilePath,
          `${readme.slice(0, index)}<!-- Dependencies -->${
            trimmedHTML ? `\n${trimmedHTML}` : ''
          }\n<script src="${script}"></script>\n\n<!--${readme.slice(
            index + readmeMatch[0].length
          )}`
        )
      }
    }
  }
}

export const installDependencies = async (
  deps: string[],
  type: '' | 'dev' | 'peer' | 'optional'
): Promise<void> => {
  if (deps.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const subprocess = spawn(
        'yarn',
        ['add', ...deps, ...(type ? [`--${type}`] : [])],
        {
          stdio: 'inherit'
        }
      )
      subprocess.on('close', (code: number) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Error code ${code}`))
        }
      })
    })
  }
}

const packageJSONPath = path.join(__dirname, '../package.json')
export const mutatePackageJSON = async (
  diffs: Record<string, unknown>
): Promise<void> => {
  let json = null
  try {
    json = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'))
  } catch {}

  if (json === null) throw new Error('No package.json found')

  for (const [k, v] of Object.entries(diffs)) {
    if (typeof v === 'function') {
      json[k] = v(json[k])
    } else {
      json[k] = v
    }
  }

  fs.writeFileSync(
    packageJSONPath,
    prettier.format(JSON.stringify(json, null, 2), {
      ...(json?.prettier ?? {}),
      parser: 'json-stringify'
    })
  )
}
