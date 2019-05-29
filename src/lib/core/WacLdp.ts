import * as http from 'http'
import Debug from 'debug'
import { BlobTree } from '../storage/BlobTree'
import { parseHttpRequest, WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { mainHandler } from '../operationHandlers/mainHandler'
import { optionsHandler } from '../operationHandlers/optionsHandler'
import { EventEmitter } from 'events'

const debug = Debug('app')

function addBearerToken (baseUrl: URL, bearerToken: string | undefined): URL {
  const ret = new URL(baseUrl.toString())
  if (bearerToken) {
    ret.searchParams.set('bearerToken', bearerToken)
  }
  return ret
}
interface OperationHandler {
  canHandle: (wacLdpTask: WacLdpTask) => boolean
  handle: (wacLdpTask: WacLdpTask, aud: string, storage: BlobTree, skipWac: boolean) => Promise<WacLdpResponse>
}

export class WacLdp extends EventEmitter {
  aud: string
  storage: BlobTree
  updatesViaUrl: URL
  skipWac: boolean
  operationHandlers: Array<OperationHandler>
  constructor (storage: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean) {
    super()
    this.storage = storage
    this.aud = aud
    this.updatesViaUrl = updatesViaUrl
    this.skipWac = skipWac
    this.operationHandlers = [
      optionsHandler,
      mainHandler
    ]
  }
  handleOperation (wacLdpTask: WacLdpTask): Promise<WacLdpResponse> {
    for (let i = 0; i < this.operationHandlers.length; i++) {
      if (this.operationHandlers[i].canHandle(wacLdpTask)) {
        return this.operationHandlers[i].handle(wacLdpTask, this.aud, this.storage, this.skipWac)
      }
    }
    throw new ErrorResult(ResultType.InternalServerError)
  }

  async handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void> {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    let bearerToken: string | undefined
    try {
      const wacLdpTask: WacLdpTask = await parseHttpRequest(this.aud, httpReq)
      bearerToken = wacLdpTask.bearerToken
      response = await this.handleOperation(wacLdpTask)
    } catch (error) {
      debug('errored', error)
      response = error as WacLdpResponse
    }
    try {
      debug('response is', response)
      return sendHttpResponse(response, addBearerToken(this.updatesViaUrl, bearerToken), httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  hasAccess (webId: URL, origin: string, url: URL, mode: URL) {
    return false
  }
}

export function makeHandler (storage: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean) {
  const wacLdp = new WacLdp(storage, aud, updatesViaUrl, skipWac)
  return wacLdp.handler.bind(wacLdp)
}
