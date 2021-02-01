import fs from 'fs'
import path from 'path'
import lineColumn from 'line-column'
import {} from './index'

it('should not include dirname', async () => {
  const file = fs.readFileSync(path.join(__dirname, './index.ts'), 'utf8')
  const index = file.indexOf('__dirname')

  expect(lineColumn(file).fromIndex(index)).toEqual(null)
})
