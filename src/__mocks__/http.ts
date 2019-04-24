import * as http from 'http'
export function createServer (handler) {
  const server = http.createServer(handler)
  return Object.assign(server, {
    listen: jest.fn(() => {
      //
    }),
    stop: jest.fn(() => {
      //
    })
  }) as http.Server
}
