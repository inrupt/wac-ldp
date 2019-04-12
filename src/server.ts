import * as http from 'http'
import Debug from 'debug'

const debug = Debug('server')
const port = 8080

const handler = (req, res) => {
  res.writeHead(200)
  res.end('todo: implement')
}

const server = http.createServer(handler)

// ...
server.listen(port)
debug('listening on port', port)
