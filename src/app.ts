import * as http from 'http'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree } from './lib/storage/BlobTree'
import { parseHttpRequest, LdpTask, TaskType } from './lib/api/http/HttpParser'

import { ContainerReader } from './lib/operations/ContainerReader'
import { ContainerMemberAdder } from './lib/operations/ContainerMemberAdder'
import { ContainerDeleter } from './lib/operations/ContainerDeleter'

import { GlobReader } from './lib/operations/GlobReader'

import { BlobReader } from './lib/operations/BlobReader'
import { BlobWriter } from './lib/operations/BlobWriter'
import { BlobUpdater } from './lib/operations/BlobUpdater'
import { BlobDeleter } from './lib/operations/BlobDeleter'

import { sendHttpResponse, LdpResponse } from './lib/api/http/HttpResponder'
import Processor from './processors/Processor'

export default (storage: BlobTree) => {
  const processors = {
    // input type: LdpTask
    // output type: LdpResponse
    [TaskType.containerRead]: new ContainerReader(storage),
    [TaskType.containerDelete]: new ContainerDeleter(storage),
    [TaskType.containerMemberAdd]: new ContainerMemberAdder(storage),
    [TaskType.globRead]: new GlobReader(storage),
    [TaskType.blobRead]: new BlobReader(storage),
    [TaskType.blobWrite]: new BlobWriter(storage),
    [TaskType.blobUpdate]: new BlobUpdater(storage),
    [TaskType.blobDelete]: new BlobDeleter(storage)
  }

  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: LdpResponse
    try {
      const ldpTask: LdpTask = await parseHttpRequest(httpReq)
      debug('parsed', ldpTask)
      const requestProcessor: Processor = processors[ldpTask.ldpTaskType]
      response = await requestProcessor.process(ldpTask)
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
