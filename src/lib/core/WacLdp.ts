import * as http from 'http'
import { EventEmitter } from 'events'

export interface WacLdp extends EventEmitter {
  handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void>
}
