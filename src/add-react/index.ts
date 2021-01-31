import {
  getState,
  setState,
  addScriptDependency,
  installDependencies
} from '../utils'
import fs from 'fs'
import path from 'path'
import dedent from 'dedent'
import appRoot from 'app-root-path'

const storybookDir = path.join(appRoot.path, '.storybook')

const run = async () => {
  if (getState().hasAddedReact) {
    return console.log('Already added React')
  }

  if (fs.existsSync(storybookDir)) {
    return console.log(
      dedent`
        This script installs and configures storybook.
        Remove your '.storybook' directory and any storybook packages
        (but keep your stories!) before running this script
      `
    )
  }

  addScriptDependency(
    'https://unpkg.com/react/umd/react.production.min.js',
    'https://unpkg.com/react-dom/umd/react-dom.production.min.js'
  )

  await installDependencies(['react', 'react-dom'], 'peer')

  await installDependencies(
    [
      '@babel/preset-react',
      '@testing-library/react',
      '@types/react',
      '@types/react-dom',
      '@types/testing-library__react',
      'babel-preset-react-app',
      'eslint-plugin-react',
      'eslint-plugin-react-hooks',
      'react',
      'react-dom',
      'react-test-renderer',
      // storybook
      '@storybook/addon-actions',
      '@storybook/addon-essentials',
      '@storybook/addon-knobs',
      '@storybook/addon-links',
      '@storybook/react',
      'storybook'
    ],
    'dev'
  )

  fs.mkdirSync(storybookDir)
  fs.writeFileSync(
    path.join(storybookDir, 'main.js'),
    dedent`
      module.exports = {
        stories: [
          "../src/**/*.stories.mdx",
          "../src/**/*.stories.@(js|jsx|ts|tsx)"
        ],
        addons: [
          "@storybook/addon-links",
          "@storybook/addon-essentials",
          "@storybook/addon-knobs/register"
        ]
      }
    ` + '\n'
  )
  fs.writeFileSync(
    path.join(storybookDir, 'preview.js'),
    dedent`
      export const parameters = {
        actions: { argTypesRegex: "^on[A-Z].*" },
      }
    ` + '\n'
  )

  setState({ hasAddedReact: true })
}

run()
