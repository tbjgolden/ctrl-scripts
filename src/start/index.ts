import { getState } from '../utils'
import { spawn } from 'child_process'

export const start = async (): Promise<void> => {
  // Storybook
  if (getState().hasAddedReact) {
    ;(() => {
      try {
        require('@storybook/react/dist/server')
      } catch {}
    })()
  }

  // Jest
  spawn('yarn', ['watch'], { stdio: 'inherit' })
}


/*
// stmux -c line -w error -e ERROR -m beep,system -M -- [ "yarn watch" : "npm run dev:sv" ]
*/
