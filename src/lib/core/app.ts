import * as http from 'http'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree, Path } from '../storage/BlobTree'
import { Container } from '../storage/Container'

import { parseHttpRequest, WacLdpTask, TaskType } from '../api/http/HttpParser'

import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'

import { executeTask } from './executeTask'

export function makeHandler (storage: BlobTree, aud: string) {
  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    try {
      const wacLdpTask: WacLdpTask = await parseHttpRequest(httpReq)
      response = await executeTask(wacLdpTask, aud, storage)
    } catch (error) {
      debug('errored', error)
      response = error as WacLdpResponse
    }
    try {
      debug('response is', response)
      return sendHttpResponse(response, httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  return handle
}

export * from './checkAccess' // checkAccess, AccessCheckTask
export * from '../storage/BlobTree' // Path and BlobTree
