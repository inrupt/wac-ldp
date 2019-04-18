import * as http from 'http'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree } from './lib/storage/BlobTree'
import { parseHttpRequest, WacLdpTask, TaskType } from './lib/api/http/HttpParser'

import { readContainer } from './lib/operations/readContainer'
import { addContainerMember } from './lib/operations/addContainerMember'
import { deleteContainer } from './lib/operations/deleteContainer'

import { readGlob } from './lib/operations/readGlob'

import { readBlob } from './lib/operations/readBlob'
import { writeBlob } from './lib/operations/writeBlob'
import { updateBlob } from './lib/operations/updateBlob'
import { deleteBlob } from './lib/operations/deleteBlob'

import { unknownOperation } from './lib/operations/unknownOperation'

import { sendHttpResponse, WacLdpResponse } from './lib/api/http/HttpResponder'

export function makeHandler (storage: BlobTree) {
  const operations = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.containerRead]: readContainer,
    [TaskType.containerDelete]: deleteContainer,
    [TaskType.containerMemberAdd]: addContainerMember,
    [TaskType.globRead]: readGlob,
    [TaskType.blobRead]: readBlob,
    [TaskType.blobWrite]: writeBlob,
    [TaskType.blobUpdate]: updateBlob,
    [TaskType.blobDelete]: deleteBlob,
    [TaskType.unknown]: unknownOperation
  }

  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    try {
      const ldpTask: WacLdpTask = await parseHttpRequest(httpReq)
      debug('parsed', ldpTask)
      switch (ldpTask.ldpTaskType) {
        case TaskType.containerRead: return
      }
      debug('operation', {
        [TaskType.containerRead]: 'readContainer',
        [TaskType.containerMemberAdd]: 'addContainerMember',
        [TaskType.containerDelete]: 'deleteContainer',
        [TaskType.globRead]: 'readGlob',
        [TaskType.blobRead]: 'readBlob',
        [TaskType.blobWrite]: 'writeBlob',
        [TaskType.blobUpdate]: 'updateBlob',
        [TaskType.blobDelete]: 'deleteBlob',
        [TaskType.unknown]: 'unknown'
      }[ldpTask.ldpTaskType])
      const requestProcessor = operations[ldpTask.ldpTaskType]
      response = await requestProcessor.apply(null, [ldpTask, storage])
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
