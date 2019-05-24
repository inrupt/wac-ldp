
import { OriginCheckTask, appIsTrustedForMode } from '../auth/appIsTrustedForMode'
import { ModesCheckTask, determineAllowedAgentsForModes, AccessModes, AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN } from '../auth/determineAllowedAgentsForModes'
import { ACL } from '../rdf/rdf-constants'
import { determineWebId } from '../auth/determineWebId'
import { Path, BlobTree } from '../storage/BlobTree'
import Debug from 'debug'
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { RdfFetcher, ACL_SUFFIX } from '../rdf/RdfFetcher'

const debug = Debug('checkAccess')

function determineRequiredAccessModes (wacLdpTaskType: TaskType, resourceIsAclDocument: boolean) {
  if (wacLdpTaskType === TaskType.unknown || wacLdpTaskType === TaskType.getOptions) {
    return []
  }
  if (resourceIsAclDocument) {
    return ['control']
  }
  if ([TaskType.blobRead, TaskType.containerRead, TaskType.globRead].indexOf(wacLdpTaskType) !== -1) {
    return ['read']
  }
  if ([TaskType.blobDelete, TaskType.containerDelete, TaskType.blobWrite].indexOf(wacLdpTaskType) !== -1) {
    return ['write']
  }
  if (wacLdpTaskType === TaskType.blobUpdate) {
    return ['read', 'write'] // can fall back to 'read' + 'append' with appendOnly = true
  }
  if (wacLdpTaskType === TaskType.containerMemberAdd) {
    return ['append']
  }
  debug('Failed to determine required access modes from task type')
  throw new ErrorResult(ResultType.InternalServerError)
}

async function modeAllowed (mode: string, allowedAgentsForModes: AccessModes, webId: URL | undefined, origin: string | undefined, graphFetcher: RdfFetcher): Promise<boolean> {
  // first check agent:
  const agents = (allowedAgentsForModes as any)[mode]
  debug(mode, agents)
  if ((agents.indexOf(AGENT_CLASS_ANYBODY) === -1) &&
      (agents.indexOf(AGENT_CLASS_ANYBODY_LOGGED_IN) === -1) &&
      (agents.indexOf(webId) === -1)) {
    debug('agent check returning false')
    return false
  }
  debug('agent check passed!')

  // then check origin:
  return appIsTrustedForMode({
    origin,
    mode,
    resourceOwners: allowedAgentsForModes.control
  } as OriginCheckTask, graphFetcher)
}

export interface AccessCheckTask {
  url: URL,
  isContainer: boolean,
  webId: URL | undefined,
  origin: string,
  wacLdpTaskType: TaskType,
  rdfFetcher: RdfFetcher
}

function urlHasSuffix (url: URL, suffix: string) {
  return (url.toString().substr(-suffix.length) === suffix)
}

function removeUrlSuffix (url: URL, suffix: string): URL {
  const urlStr = url.toString()
  const remainingLength: number = urlStr.length - suffix.length
  if (remainingLength < 0) {
    throw new Error('no suffix match (URL shorter than suffix)')
  }
  if (urlStr[urlStr.length - 1].substring(remainingLength) !== suffix) {
    throw new Error('no suffix match')
  }
  return new URL(urlStr.substring(0, remainingLength))
}

export async function checkAccess (task: AccessCheckTask) {
  let baseResourceUrl: URL
  let resourceIsAclDocument
  if (urlHasSuffix(task.url, ACL_SUFFIX)) {
    // editing an ACL file requires acl:Control on the base resource
    baseResourceUrl = removeUrlSuffix(task.url, ACL_SUFFIX)
    resourceIsAclDocument = true
  } else {
    baseResourceUrl = task.url
    resourceIsAclDocument = false
  }
  const { aclGraph, topicPath, isAdjacent } = await task.rdfFetcher.readAcl(baseResourceUrl)
  debug('aclGraph', aclGraph)

  const allowedAgentsForModes: AccessModes = await determineAllowedAgentsForModes({
    aclGraph,
    resourceIsTarget: isAdjacent,
    targetUrl: new URL(topicPath.toString()),
    contextUrl: new URL(topicPath.toString() + ACL_SUFFIX)
  } as ModesCheckTask)
  debug('allowedAgentsForModes', allowedAgentsForModes)
  const requiredAccessModes = determineRequiredAccessModes(task.wacLdpTaskType, resourceIsAclDocument)
  let appendOnly = false

  // throw if agent or origin does not have access
  await Promise.all(requiredAccessModes.map(async (mode: string) => {
    debug('required mode', mode)
    if (await modeAllowed(mode, allowedAgentsForModes, task.webId, task.origin, task.rdfFetcher)) {
      debug(mode, 'is allowed!')
      return
    }
    debug(`mode ${mode} is not allowed, but checking for appendOnly now`)
    // SPECIAL CASE: append-only
    if (mode === 'write' && await modeAllowed('append', allowedAgentsForModes, task.webId, task.origin, task.rdfFetcher)) {
      appendOnly = true
      debug('write was requested and is not allowed but append is; setting appendOnly to true')
      return
    }
    debug(`Access denied! ${mode} access is required for this task, webid is "${task.webId}"`)
    throw new ErrorResult(ResultType.AccessDenied)
  }))
  // webId may be reused to check individual ACLs on individual member resources for Glob
  // appendOnly may be used to restrict PATCH operations
  return appendOnly
}
