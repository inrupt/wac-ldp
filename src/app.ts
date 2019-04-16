import * as http from 'http'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree } from './lib/storage/BlobTree'
import { parseHttpRequest, LdpTask, TaskType } from './lib/api/http/HttpParser'

import { readContainer } from './lib/operations/readContainer'
import { addContainerMember } from './lib/operations/addContainerMember'
import { deleteContainer } from './lib/operations/deleteContainer'

import { readGlob } from './lib/operations/readGlob'

import { readBlob } from './lib/operations/readBlob'
import { writeBlob } from './lib/operations/writeBlob'
import { updateBlob } from './lib/operations/updateBlob'
import { deleteBlob } from './lib/operations/deleteBlob'

import { sendHttpResponse, LdpResponse } from './lib/api/http/HttpResponder'

export default (storage: BlobTree) => {
  const processors = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.containerRead]: readContainer,
    [TaskType.containerDelete]: deleteContainer,
    [TaskType.containerMemberAdd]: addContainerMember,
    [TaskType.globRead]: readGlob,
    [TaskType.blobRead]: readBlob,
    [TaskType.blobWrite]: writeBlob,
    [TaskType.blobUpdate]: updateBlob,
    [TaskType.blobDelete]: deleteBlob
  }

  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: LdpResponse
    try {
      const ldpTask: LdpTask = await parseHttpRequest(httpReq)
      debug('parsed', ldpTask)
      switch (ldpTask.ldpTaskType) {
        case TaskType.containerRead: return
      }
      const requestProcessor = processors[ldpTask.ldpTaskType]
      const response: LdpResponse = await requestProcessor.apply(null, [ldpTask, storage])
      debug('executed', response)
    } catch (error) {
      debug('errored', error)
      response = error as LdpResponse
    }
    try {
      return sendHttpResponse(response, httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  return handle
}
