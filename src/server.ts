import * as http from 'http'
import Debug from 'debug'
import { BlobTreeInMem } from './lib/storage/BlobTreeInMem'
import { makeHandler } from './lib/core/app'
import { BlobTree } from './lib/storage/BlobTree'

const debug = Debug('server')

class Server {
  storage: BlobTree
  server: http.Server
  port: number
  constructor (port: number, aud: string) {
    this.port = port
    this.storage = new BlobTreeInMem() // singleton in-memory storage
    const handler = makeHandler(this.storage, aud)
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
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080

const aud = process.env.AUD || 'https://localhost:8443'
const server = new Server(port, aud)
server.listen()
// server.close()

export function closeServer () {
  debug('closing server')
  server.close()
}
