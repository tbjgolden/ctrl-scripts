import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import prettier from 'prettier'
import appRoot from 'app-root-path'

export type State = {
  lastSync: number
  hasAddedReact: boolean
}

const defaults: State = {
  lastSync: 0,
  hasAddedReact: false
}

const stateFilePath = path.join(appRoot.path, 'config/state.json')

const readmeFilePath = path.join(appRoot.path, 'README.md')
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

const packageJSONPath = path.join(appRoot.path, 'package.json')
export const formatJSON = (obj: unknown): string => {
  const json = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'))
  return prettier.format(JSON.stringify(obj), {
    ...(json?.prettier ?? {}),
    parser: 'json-stringify'
  })
}

export const mutatePackageJSON = (diffs: Record<string, unknown>): void => {
  store(packageJSONPath, diffs)
}

export const getState = (): State => store(stateFilePath, undefined, defaults)

export const setState = (diffs: Partial<State>): void => {
  store(stateFilePath, diffs, defaults)
}

export const store = <T extends Record<string, unknown>>(
  filePath: string,
  diffs?: Partial<T>,
  defaults?: T
): T => {
  let json = (defaults ?? {}) as T
  try {
    json = {
      ...defaults,
      ...JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch {
    fs.writeFileSync(filePath, formatJSON(json))
  }

  if (diffs) {
    for (const [k, v] of Object.entries(diffs)) {
      json[k as keyof T] = typeof v === 'function' ? v(json[k]) : v
    }

    fs.writeFileSync(filePath, formatJSON(json))
  }

  return json
}
