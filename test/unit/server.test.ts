jest.mock('../../src/lib/core/WacLdp')
import { makeHandler } from '../../src/lib/core/WacLdp'
import { closeServer } from '../../src/server'

test('server', () => {
  (makeHandler as any).mockImplementation(() => {
    // console.log('called!')
  })
  closeServer()
})
