import * as http from 'http'
import Debug from 'debug'
import { BlobTree } from '../storage/BlobTree'
import { parseHttpRequest, WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse } from '../api/http/HttpResponder'
import { executeTask } from './executeTask'

const debug = Debug('app')

function addBearerToken (baseUrl: URL, bearerToken: string | undefined): URL {
  const ret = new URL(baseUrl.toString())
  if (bearerToken) {
    ret.searchParams.set('bearerToken', bearerToken)
  }
  return ret
}

export function makeHandler (storage: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean) {
  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    let bearerToken: string | undefined
    try {
      const wacLdpTask: WacLdpTask = await parseHttpRequest(aud, httpReq)
      bearerToken = wacLdpTask.bearerToken
      response = await executeTask(wacLdpTask, aud, storage, skipWac)
    } catch (error) {
      debug('errored', error)
      response = error as WacLdpResponse
    }
    try {
      debug('response is', response)
      return sendHttpResponse(response, addBearerToken(updatesViaUrl, bearerToken), httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  return handle
}
