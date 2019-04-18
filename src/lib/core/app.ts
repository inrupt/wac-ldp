import * as http from 'http'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree, Path } from '../storage/BlobTree'
import { Node } from '../storage/Node'

import { parseHttpRequest, WacLdpTask, TaskType } from '../api/http/HttpParser'

import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { getBlobAndCheckETag } from './getBlobAndCheckETag'

import { determineTask } from './determineTask'
import { checkAccess } from './checkAccess'
import { determineOperation } from './determineOperation'

export function makeHandler (storage: BlobTree) {
  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    try {
      const wacLdpTask: WacLdpTask = await determineTask(httpReq)

      await checkAccess(wacLdpTask) // may throw if access is denied

      let node: Node
      if (wacLdpTask.isContainer) {
        node = storage.getContainer(wacLdpTask.path)
      } else {
        debug('not a container, getting blob and checking etag')
        node = await getBlobAndCheckETag(wacLdpTask, storage)
      }

      const operation = determineOperation(wacLdpTask.ldpTaskType)
      response = await operation.apply(null, [wacLdpTask, node])
      debug('executed', response)
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
