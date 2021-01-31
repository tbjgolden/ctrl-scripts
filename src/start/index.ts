import { getState } from '../utils'
import { spawn } from 'child_process'

// Storybook
if (getState().hasAddedReact) {
  ;(() => {
    try {
      require('@storybook/react/dist/server')
    } catch {}
  })()
}

// Jest
spawn('yarn', ['run', 'test:src', '--watch'], { stdio: 'inherit' })
