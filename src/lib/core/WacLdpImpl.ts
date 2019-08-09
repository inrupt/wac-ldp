import * as http from 'http'
import Debug from 'debug'
import { BufferTree } from '../storage/BufferTree'
import { WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { optionsHandler } from '../operationHandlers/optionsHandler'
import { WacLdp } from './WacLdp'
import { StoreManager } from '../rdf/StoreManager'
import { globReadHandler } from '../operationHandlers/globReadHandler'
import { containerMemberAddHandler } from '../operationHandlers/containerMemberAddHandler'
import { readContainerHandler } from '../operationHandlers/readContainerHandler'
import { deleteContainerHandler } from '../operationHandlers/deleteContainerHandler'
import { readBlobHandler } from '../operationHandlers/readBlobHandler'
import { writeBlobHandler } from '../operationHandlers/writeBlobHandler'
import { updateBlobHandler } from '../operationHandlers/updateBlobHandler'
import { deleteBlobHandler } from '../operationHandlers/deleteBlobHandler'
import { unknownOperationCatchAll } from '../operationHandlers/unknownOperationCatchAll'
import { checkAccess, AccessCheckTask } from '../authorization/checkAccess'
import { getAppModes } from '../authorization/appIsTrustedForMode'
import { setAppModes } from '../rdf/setAppModes'
import { AclManager } from '../authorization/AclManager'
import { objectToStream, makeResourceData } from '../rdf/ResourceDataUtils'
import { RdfLibStoreManager } from '../rdf/RdfLibStoreManager'
import { EventEmitter } from 'events'

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
  requiredAccessModes: Array<URL>
  handle: (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean) => Promise<WacLdpResponse>
}

export interface WacLdpOptions {
  storage: BufferTree
  aud: string
  updatesViaUrl: URL,
  skipWac: boolean,
  idpHost: string,
  usesHttps: boolean
}

export class WacLdpImpl extends EventEmitter implements WacLdp {
  aud: string
  storeManager: StoreManager
  aclManager: AclManager
  updatesViaUrl: URL
  skipWac: boolean
  operationHandlers: Array<OperationHandler>
  idpHost: string
  usesHttps: boolean
  constructor (options: WacLdpOptions) {
    super()
    const serverRootDomain: string = new URL(options.aud).host
    debug({ serverRootDomain })
    this.storeManager = new RdfLibStoreManager(serverRootDomain, options.storage)
    this.aclManager = new AclManager(this.storeManager)
    this.aud = options.aud
    this.updatesViaUrl = options.updatesViaUrl
    this.skipWac = options.skipWac
    this.idpHost = options.idpHost
    this.usesHttps = options.usesHttps
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
  async handleOperation (task: WacLdpTask): Promise<WacLdpResponse> {
    for (let i = 0; i < this.operationHandlers.length; i++) {
      if (this.operationHandlers[i].canHandle(task)) {
        let appendOnly = false
        if (!this.skipWac) {
          appendOnly = await checkAccess({
            url: task.fullUrl(),
            isContainer: task.isContainer(),
            webId: await task.webId(),
            origin: await task.origin(),
            requiredAccessModes: this.operationHandlers[i].requiredAccessModes,
            storeManager: this.storeManager
          } as AccessCheckTask) // may throw if access is denied
        }
        debug('calling operation handler', i, task, this.storeManager, this.aud, this.skipWac, appendOnly)
        return this.operationHandlers[i].handle(task, this.storeManager, this.aud, this.skipWac, appendOnly)
      }
    }
    throw new ErrorResult(ResultType.InternalServerError)
  }

  async handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void> {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    let storageOrigin: string | undefined
    let requestOrigin: string | undefined
    let bearerToken: string | undefined
    try {
      const wacLdpTask: WacLdpTask = new WacLdpTask(this.aud, httpReq, this.usesHttps)
      storageOrigin = wacLdpTask.storageOrigin()
      requestOrigin = await wacLdpTask.origin()
      bearerToken = wacLdpTask.bearerToken()
      response = await this.handleOperation(wacLdpTask)
      debug('resourcesChanged')
      if (response.resourcesChanged) {
        response.resourcesChanged.forEach((url: URL) => {
          debug('emitting change event', url)
          this.emit('change', { url })
        })
      }
    } catch (error) {
      debug('errored', error)
      if (error.resultType) {
        debug('error has a responseStatus', error.resultType)
        response = error as WacLdpResponse
      } else {
        debug('error has no resultType', error.message, error)
        response = new ErrorResult(ResultType.InternalServerError) as unknown as WacLdpResponse
      }
    }
    try {
      debug('response is', response)
      return sendHttpResponse(response, {
        updatesVia: addBearerToken(this.updatesViaUrl, bearerToken),
        storageOrigin,
        idpHost: this.idpHost,
        originToAllow: requestOrigin || '*'
      }, httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
}
