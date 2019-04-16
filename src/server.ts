import * as http from 'http'
import Debug from 'debug'

const debug = Debug('server')

class Server {
  server: http.Server
  port: number
  constructor (port: number) {
    this.port = port
    this.server = http.createServer((req, res) => {
      res.writeHead(200)
      res.end('todo: implement')
    })
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
