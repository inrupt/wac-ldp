import * as http from 'http'
import Debug from 'debug'
import { BlobTree } from '../storage/BlobTree'
import { WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { optionsHandler } from '../operationHandlers/optionsHandler'
import { EventEmitter } from 'events'
import { RdfLayer } from '../rdf/RdfLayer'
import { globReadHandler } from '../operationHandlers/globReadHandler'
import { containerMemberAddHandler } from '../operationHandlers/containerMemberAddHandler'
import { readContainerHandler } from '../operationHandlers/readContainerHandler'
import { deleteContainerHandler } from '../operationHandlers/deleteContainerHandler'
import { readBlobHandler } from '../operationHandlers/readBlobHandler'
import { writeBlobHandler } from '../operationHandlers/writeBlobHandler'
import { updateBlobHandler } from '../operationHandlers/updateBlobHandler'
import { deleteBlobHandler } from '../operationHandlers/deleteBlobHandler'
import { unknownOperationCatchAll } from '../operationHandlers/unknownOperationCatchAll'

export const BEARER_PARAM_NAME = 'bearer_token'

const debug = Debug('app')

function addBearerToken (baseUrl: URL, bearerToken: string | undefined): URL {
  const ret = new URL(baseUrl.toString())
  if (bearerToken) {
    ret.searchParams.set(BEARER_PARAM_NAME, bearerToken)
  }
  return ret
}
interface OperationHandler {
  canHandle: (wacLdpTask: WacLdpTask) => boolean
  handle: (wacLdpTask: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean) => Promise<WacLdpResponse>
}

export class WacLdp extends EventEmitter {
  aud: string
  rdfLayer: RdfLayer
  updatesViaUrl: URL
  skipWac: boolean
  operationHandlers: Array<OperationHandler>
  constructor (storage: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean) {
    super()
    this.rdfLayer = new RdfLayer(aud, storage)
    this.aud = aud
    this.updatesViaUrl = updatesViaUrl
    this.skipWac = skipWac
    this.operationHandlers = [
      optionsHandler,
      globReadHandler,
      containerMemberAddHandler,
      readContainerHandler,
      deleteContainerHandler,
      readBlobHandler,
      writeBlobHandler,
      updateBlobHandler,
      deleteBlobHandler,
      unknownOperationCatchAll
    ]
  }
  setRootAcl (owner: URL) {
    return this.rdfLayer.setRootAcl(owner)
  }
  handleOperation (wacLdpTask: WacLdpTask): Promise<WacLdpResponse> {
    for (let i = 0; i < this.operationHandlers.length; i++) {
      if (this.operationHandlers[i].canHandle(wacLdpTask)) {
        return this.operationHandlers[i].handle(wacLdpTask, this.aud, this.rdfLayer, this.skipWac)
      }
    }
    throw new ErrorResult(ResultType.InternalServerError)
  }

  async handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void> {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    let bearerToken: string | undefined
    try {
      const wacLdpTask: WacLdpTask = new WacLdpTask(this.aud, httpReq)
      bearerToken = wacLdpTask.bearerToken()
      response = await this.handleOperation(wacLdpTask)
      debug('resourcesChanged', response.resourceData)
      if (response.resourcesChanged) {
        response.resourcesChanged.forEach((url: URL) => {
          debug('emitting change event', url)
          this.emit('change', { url })
        })
      }
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
