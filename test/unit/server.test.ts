import * as http from 'http'
jest.mock('../../src/lib/core/app')
import { makeHandler } from '../../src/lib/core/app'
import { closeServer } from '../../src/server'

test('server', () => {
  (makeHandler as any).mockImplementation(() => {
    console.log('called!')
    //
  })
  closeServer()
})
