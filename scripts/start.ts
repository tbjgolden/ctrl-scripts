import { PersistentState } from './utils'
import { spawn } from 'child_process'

const state = new PersistentState()

// Storybook
if (state.get().hasAddedReact) {
  ;(() => {
    try {
      require('@storybook/react/dist/server')
    } catch {}
  })()
}

// Jest
spawn('yarn', ['run', 'test:src', '--watch'], { stdio: 'inherit' })
