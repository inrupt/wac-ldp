import * as http from 'http'
import Debug from 'debug'
import { BlobTree } from '../storage/BlobTree'
import { WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { EventEmitter } from 'events'
import { RdfLayer } from '../rdf/RdfLayer'
import { OptionsHandler } from '../operationHandlers/OptionsHandler'
import { GlobReadHandler } from '../operationHandlers/GlobReadHandler'
import { ContainerMemberAddHandler } from '../operationHandlers/ContainerMemberAddHandler'
import { ReadContainerHandler } from '../operationHandlers/ReadContainerHandler'
import { DeleteContainerHandler } from '../operationHandlers/DeleteContainerHandler'
import { ReadBlobHandler } from '../operationHandlers/ReadBlobHandler'
import { WriteBlobHandler } from '../operationHandlers/WriteBlobHandler'
import { UpdateBlobHandler } from '../operationHandlers/UpdateBlobHandler'
import { DeleteBlobHandler } from '../operationHandlers/DeleteBlobHandler'
import { UnknownOperationCatchAll } from '../operationHandlers/UnknownOperationCatchAll'
import { checkAccess } from './checkAccess'
import { OperationHandler } from '../operationHandlers/OperationHandler'

export const BEARER_PARAM_NAME = 'bearer_token'

const debug = Debug('app')

function addBearerToken (baseUrl: URL, bearerToken: string | undefined): URL {
  const ret = new URL(baseUrl.toString())
  if (bearerToken) {
    ret.searchParams.set(BEARER_PARAM_NAME, bearerToken)
  }
  return ret
}
export class WacLdp extends EventEmitter {
  aud: string
  rdfLayer: RdfLayer
  updatesViaUrl: URL
  skipWac: boolean
  operationHandlers: Array<{ new(): OperationHandler }>
  constructor (storage: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean) {
    super()
    this.rdfLayer = new RdfLayer(aud, storage)
    this.aud = aud
    this.updatesViaUrl = updatesViaUrl
    this.skipWac = skipWac
    this.operationHandlers = [
      OptionsHandler,
      GlobReadHandler,
      ContainerMemberAddHandler,
      ReadContainerHandler,
      DeleteContainerHandler,
      ReadBlobHandler,
      WriteBlobHandler,
      UpdateBlobHandler,
      DeleteBlobHandler,
      UnknownOperationCatchAll
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
  async hasAccess (webId: URL, origin: string, url: URL, mode: URL): Promise<boolean> {
    debug('hasAccess calls checkAccess', {
      url,
      webId,
      origin,
      requiredAccessModes: [ mode ],
      rdfLayer: 'this.rdfLayer'
    })
    try {
      const appendOnly = await checkAccess({
        url,
        webId,
        origin,
        requiredAccessModes: [ mode ],
        rdfLayer: this.rdfLayer
      })
      debug({ appendOnly })
      return !appendOnly
    } catch (e) {
      debug('access check error was thrown, so returning no to hasAccess question')
      return false
    }
  }
}

export function makeHandler (storage: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean) {
  const wacLdp = new WacLdp(storage, aud, updatesViaUrl, skipWac)
  return wacLdp.handler.bind(wacLdp)
}
