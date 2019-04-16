import * as http from 'http'
import Debug from 'debug'
import { BlobTreeInMem } from './lib/storage/BlobTreeInMem'
import { makeHandler } from './app'
import { BlobTree } from './lib/storage/BlobTree'

const debug = Debug('server')

class Server {
  storage: BlobTree
  server: http.Server
  port: number
  constructor (port: number) {
    this.port = port
    this.storage = new BlobTreeInMem() // singleton in-memory storage
    const handler = makeHandler(this.storage)
    this.server = http.createServer(handler)
  }
  listen () {
    this.server.listen(this.port)
    debug('listening on port', this.port)
  }
}

// on startup:
const port = parseInt(process.env.PORT, 10) || 8080
const server = new Server(port)
server.listen()
