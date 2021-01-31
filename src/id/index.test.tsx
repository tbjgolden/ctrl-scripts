import { id } from './index'

describe('id function', () => {
  it('should generate id correctly with default', async () => {
    expect(/^lorem-\d{5,}$/.test(id('lorem'))).toBe(true)
  })

  it('should generate id correctly without default', async () => {
    expect(/^init-\d{5,}$/.test(id())).toBe(true)
  })
})
