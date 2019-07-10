// START VSCode debugging settings, see https://github.com/visionmedia/debug/issues/641#issuecomment-490706752
declare global {
	namespace NodeJS {
    interface Process {
      browser: boolean
    }
    interface Global {
      window: object
    }
  }
}
process.browser = true
global.window = { process: { type: 'renderer' } }
process.env.DEBUG = '*'
// END VSCode debugging settings

import * as http from 'http'
import Debug from 'debug'
import { BlobTreeInMem } from './lib/storage/BlobTreeInMem'
import { makeHandler } from './lib/core/WacLdp'
import { BlobTree, Path } from './lib/storage/BlobTree'

const debug = Debug('server')

class Server {
  storage: BlobTree
  server: http.Server
  port: number
  constructor (port: number, aud: string, skipWac: boolean) {
    this.port = port
    this.storage = new BlobTreeInMem() // singleton in-memory storage
    const handler = makeHandler(this.storage, aud, new URL('wss://localhost:8443'), skipWac, 'localhost:8443', false)
    this.server = http.createServer(handler)
  }
  listen () {
    this.server.listen(this.port)
    debug('listening on port', this.port)
  }
  close () {
    this.server.close()
    debug('closing port', this.port)
  }
}

// on startup:
const port: number = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080
const skipWac: boolean = !!process.env.SKIP_WAC

const aud = process.env.AUD || `http://localhost:${port}`
const server = new Server(port, aud, skipWac)
server.listen()
// server.close()

export function closeServer () {
  debug('closing server')
  server.close()
}
