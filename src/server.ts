import * as http from 'http'
import Debug from 'debug'

const debug = Debug('server')
const port = parseInt(process.env.PORT, 10) || 8080

class Server {
  server: http.Server
  port: number
  constructor (port: number) {
    this.server = http.createServer((req, res) => {
      res.writeHead(200)
      res.end('todo: implement')
    })
  }
  listen () {
    this.server.listen(this.port)
  }
}

// on startup:
const server = new Server(port)
server.listen()
debug('listening on port', port)
