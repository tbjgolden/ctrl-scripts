import fs from 'fs'
import path from 'path'
import dedent from 'dedent'
import { getState } from '../utils'
import appRoot from 'app-root-path'

const run = async (name?: string) => {
  if (typeof name !== 'string' || !/^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/.test(name)) {
    throw new Error('Name must be a PascalCase string')
  }

  if (!getState().hasAddedReact) {
    throw new Error('Need to add React first')
  }

  // Check if already exists
  const srcDir = path.join(appRoot.path, 'src')
  const components = fs.readdirSync(srcDir, {
    withFileTypes: true
  })
  for (const component of components) {
    if (component.name === name) {
      throw new Error(
        `${
          component.isDirectory() ? 'Component' : 'File'
        } with that name already exists`
      )
    }
  }

  const newDir = path.join(srcDir, name)
  fs.mkdirSync(newDir)
  fs.writeFileSync(
    path.join(newDir, 'index.tsx'),
    dedent`
    import React from 'react'

    const ${name} = ({ text }: { text: string }): JSX.Element => <h1>{text}</h1>

    export default ${name}
    ` + '\n'
  )
  fs.writeFileSync(
    path.join(newDir, 'index.test.tsx'),
    dedent`
    import React from 'react'
    import { render, waitFor, screen } from '@testing-library/react'
    import ${name} from '.'

    it('should render correctly', async () => {
      render(<${name} text="hello there" />)
      await waitFor(() => screen.getByRole('heading'))
      expect(screen.getByRole('heading')).toHaveTextContent('hello there')
    })
    ` + '\n'
  )
  fs.writeFileSync(
    path.join(newDir, 'index.stories.tsx'),
    dedent`
    import React from 'react'
    import { withKnobs, text } from '@storybook/addon-knobs'
    import ${name} from '.'

    export default {
      component: ${name},
      title: '${name}',
      decorators: [withKnobs]
    }

    export const Default = (): JSX.Element => {
      const textValue = text('Name', 'Example Text')
      return <${name} text={textValue} />
    }
    ` + '\n'
  )

  const indexFile = components.find(({ name }) => name.startsWith('index.ts'))
    ?.name

  if (indexFile) {
    const indexPath = path.join(srcDir, indexFile)
    const fileContents = fs.readFileSync(indexPath, 'utf8')
    const lastExportFromIndex = fileContents.lastIndexOf('export * from')
    const lastExportFromNewLineIndex =
      lastExportFromIndex +
      fileContents.slice(lastExportFromIndex).indexOf('\n')
    fs.writeFileSync(
      indexPath,
      `${fileContents.slice(
        0,
        lastExportFromNewLineIndex
      )}\nexport * from './${name}'${fileContents.slice(
        lastExportFromNewLineIndex
      )}`
    )
  }
}

if (require.main === module) {
  run(...process.argv.slice(2))
}
