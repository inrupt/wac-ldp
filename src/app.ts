import * as http from 'http'
import Debug from 'debug'
const debug = Debug('app')

import { BlobTree, Path } from './BlobTree'
import { LdpParser, LdpTask, TaskType } from './processors/LdpParser'
import { DetermineWebId } from './processors/DetermineWebId'

import { ContainerReader } from './processors/ContainerReader'
import { ContainerMemberAdder } from './processors/ContainerMemberAdder'
import { ContainerDeleter } from './processors/ContainerDeleter'

import { GlobReader } from './processors/GlobReader'

import { BlobReader } from './processors/BlobReader'
import { BlobWriter } from './processors/BlobWriter'
import { BlobUpdater } from './processors/BlobUpdater'
import { BlobDeleter } from './processors/BlobDeleter'

import { Responder, LdpResponse } from './processors/Responder'
import Processor from './processors/Processor'
import { AclReader } from './processors/AclReader'
import { AgentCheckTask, DetermineAllowedModeForAgent } from './processors/DetermineAllowedModesForAgent'
import { OriginCheckTask, DetermineAllowedModeForOrigin } from './processors/DetermineAllowedModesForOrigin'

export default (storage: BlobTree) => {
  const processors = {
    // step 1, parse:
    // input type: http.IncomingMessage
    // output type: LdpTask
    parseLdp: new LdpParser(),
    determineWebId: new DetermineWebId(),
    readAcl: new AclReader(storage),
    determineAllowedModesForAgent: new DetermineAllowedModeForAgent(storage),
    determineAllowedModesForOrigin: new DetermineAllowedModeForOrigin(storage),

    // step 2, execute:
    // input type: LdpTask
    // output type: LdpResponse
    [TaskType.containerRead]: new ContainerReader(storage),
    [TaskType.containerDelete]: new ContainerDeleter(storage),
    [TaskType.containerMemberAdd]: new ContainerMemberAdder(storage),
    [TaskType.globRead]: new GlobReader(storage),
    [TaskType.blobRead]: new BlobReader(storage),
    [TaskType.blobWrite]: new BlobWriter(storage),
    [TaskType.blobUpdate]: new BlobUpdater(storage),
    [TaskType.blobDelete]: new BlobDeleter(storage),

    // step 3, handle result:
    // input type: LdpResponse
    // output type: void
    respondAndRelease: new Responder()
  }

  const handle = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    debug(`\n\n`, req.method, req.url, req.headers)

    let response: LdpResponse
    try {
      const ldpTask: LdpTask = await processors.parseLdp.process(req)
      debug('parsed', ldpTask)

      const webId = await processors.determineWebId.process(ldpTask)
      debug('webId', webId)

      let baseResourcePath: Path
      let resourceIsAclDocument
      if (ldpTask.path.asString().substr(-4) === '.acl') {
        // editing an ACL file requires acl:Control on the base resource
        const aclPathStr: string = ldpTask.path.asString()
        baseResourcePath = new Path(aclPathStr.substring(0, aclPathStr.length - 4))
        resourceIsAclDocument = true
      } else {
        baseResourcePath = ldpTask.path
        resourceIsAclDocument = false
      }
      const aclGraph = await processors.readAcl.process(baseResourcePath)
      debug('aclGraph', aclGraph)

      const allowedModesForAgent = processors.determineAllowedModesForAgent.process({
        agent: webId,
        aclGraph
      } as AgentCheckTask)
      debug('allowedModesForAgent', allowedModesForAgent)

      const allowedModesForOrigin = processors.determineAllowedModesForOrigin.process({
        origin: ldpTask.origin,
        aclGraph
      } as OriginCheckTask)
      debug('allowedModesForOrigin', allowedModesForOrigin)

      const requestProcessor: Processor = processors[ldpTask.ldpTaskType]
      response = await requestProcessor.process(ldpTask)
      debug('executed', response)
    } catch (error) {
      debug('errored', error)
      response = error as LdpResponse
    }
    response.httpRes = res
    try {
      return processors.respondAndRelease.process(response)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  return handle
}
