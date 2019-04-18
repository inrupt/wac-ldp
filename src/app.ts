import * as http from 'http'
import uuid from 'uuid/v4'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree, Path } from './lib/storage/BlobTree'
import { Node } from './lib/storage/Node'

import { parseHttpRequest, WacLdpTask, TaskType } from './lib/api/http/HttpParser'

import { readContainer } from './lib/operations/readContainer'
import { deleteContainer } from './lib/operations/deleteContainer'

import { readGlob } from './lib/operations/readGlob'

import { readBlob } from './lib/operations/readBlob'
import { writeBlob } from './lib/operations/writeBlob'
import { updateBlob } from './lib/operations/updateBlob'
import { deleteBlob } from './lib/operations/deleteBlob'

import { unknownOperation } from './lib/operations/unknownOperation'

import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from './lib/api/http/HttpResponder'
import { getBlobAndCheckETag } from './lib/operations/getBlobAndCheckETag'
import { OriginCheckTask, determineAllowedModesForOrigin } from './lib/auth/determineAllowedModesForOrigin'
import { AgentCheckTask, determineAllowedModesForAgent } from './lib/auth/determineAllowedModesForAgent'
import { determineWebId } from './lib/auth/determineWebId'
import { readAcl, ACL_SUFFIX } from './lib/auth/readAcl'

export function makeHandler (storage: BlobTree) {
  const operations = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.containerRead]: readContainer,
    [TaskType.containerDelete]: deleteContainer,
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
      // convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
      if (ldpTask.ldpTaskType === TaskType.containerMemberAdd) {
        debug('converting', ldpTask)
        ldpTask.path = ldpTask.path.toChild(uuid())
        ldpTask.ldpTaskType = TaskType.blobWrite
        ldpTask.isContainer = false
        debug('converted', ldpTask)
      }
      debug('parsed', ldpTask)

      const webId = await determineWebId(ldpTask.bearerToken)
      debug('webId', webId)

      let baseResourcePath: Path
      let resourceIsAclDocument
      if (ldpTask.path.hasSuffix(ACL_SUFFIX)) {
        // editing an ACL file requires acl:Control on the base resource
        baseResourcePath = ldpTask.path.removeSuffix(ACL_SUFFIX)
        resourceIsAclDocument = true
      } else {
        baseResourcePath = ldpTask.path
        resourceIsAclDocument = false
      }
      const aclGraph = await readAcl(baseResourcePath)
      debug('aclGraph', aclGraph)

      const allowedModesForAgent = determineAllowedModesForAgent({
        agent: webId,
        aclGraph
      } as AgentCheckTask)
      debug('allowedModesForAgent', allowedModesForAgent)

      const allowedModesForOrigin = determineAllowedModesForOrigin({
        origin: ldpTask.origin,
        aclGraph
      } as OriginCheckTask)
      debug('allowedModesForOrigin', allowedModesForOrigin)

      let node: Node
      if (ldpTask.isContainer) {
        node = storage.getContainer(ldpTask.path)
      } else {
        debug('not a container, getting blob and checking etag')
        node = await getBlobAndCheckETag(ldpTask, storage)
      }

      debug('operation', {
        // acting on a container node:
        [TaskType.containerRead]: 'readContainer',
        // [TaskType.containerMemberAdd]: 'addContainerMember', // will have been changed to blobWrite above
        [TaskType.containerDelete]: 'deleteContainer',
        [TaskType.globRead]: 'readGlob', // get the container, check the etag, list the members, filter rdf sources, merge them, respond

        // acting on a blob node:
        [TaskType.blobRead]: 'readBlob',
        [TaskType.blobWrite]: 'writeBlob',
        [TaskType.blobUpdate]: 'updateBlob',
        [TaskType.blobDelete]: 'deleteBlob',

        [TaskType.unknown]: 'unknown' // server error response
      }[ldpTask.ldpTaskType])
      const requestProcessor = operations[ldpTask.ldpTaskType]
      response = await requestProcessor.apply(null, [ldpTask, node])
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
