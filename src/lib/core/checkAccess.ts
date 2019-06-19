
import { OriginCheckTask, appIsTrustedForMode } from '../auth/appIsTrustedForMode'
import { ModesCheckTask, determineAllowedAgentsForModes, AccessModes, AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN } from '../auth/determineAllowedAgentsForModes'
import { ACL } from '../rdf/rdf-constants'
import { determineWebIdAndOrigin } from '../auth/determineWebIdAndOrigin'
import { Path, BlobTree } from '../storage/BlobTree'
import Debug from 'debug'
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { RdfLayer, ACL_SUFFIX } from '../rdf/RdfLayer'

const debug = Debug('checkAccess')

// This will be overwritten later if the resource is an ACL doc
export function determineRequiredAccessModes (wacLdpTaskType: TaskType) {
  if (wacLdpTaskType === TaskType.unknown || wacLdpTaskType === TaskType.getOptions) {
    return []
  }
  if ([TaskType.blobRead, TaskType.containerRead, TaskType.globRead].indexOf(wacLdpTaskType) !== -1) {
    return [ ACL.Read ]
  }
  if ([TaskType.blobDelete, TaskType.containerDelete, TaskType.blobWrite].indexOf(wacLdpTaskType) !== -1) {
    return [ ACL.Write ]
  }
  if (wacLdpTaskType === TaskType.blobUpdate) {
    return [ ACL.Read, ACL.Write ] // can fall back to 'read' + 'append' with appendOnly = true
  }
  if (wacLdpTaskType === TaskType.containerMemberAdd) {
    return [ ACL.Append ]
  }
  debug('Failed to determine required access modes from task type')
  throw new ErrorResult(ResultType.InternalServerError)
}

async function modeAllowed (mode: URL, allowedAgentsForModes: AccessModes, webId: URL | undefined, origin: string | undefined, graphFetcher: RdfLayer): Promise<boolean> {
  // first check agent:
  const agents = (allowedAgentsForModes as any)[mode.toString()].map((url: URL) => url.toString())
  const webIdAsString: string | undefined = (webId ? webId.toString() : undefined)
  debug(mode, agents, webId)
  if ((agents.indexOf(AGENT_CLASS_ANYBODY.toString()) === -1) &&
      (agents.indexOf(AGENT_CLASS_ANYBODY_LOGGED_IN.toString()) === -1) &&
      (!webIdAsString || agents.indexOf(webIdAsString) === -1)) {
    debug('agent check returning false')
    return false
  }
  debug('agent check passed!')

  // then check origin:
  return appIsTrustedForMode({
    origin,
    mode,
    resourceOwners: allowedAgentsForModes['http://www.w3.org/ns/auth/acl#Control']
  } as OriginCheckTask, graphFetcher)
}

export interface AccessCheckTask {
  url: URL
  webId: URL | undefined
  origin: string
  requiredAccessModes: Array<URL>
  rdfLayer: RdfLayer
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

function urlEquals (one: URL, two: URL) {
  return one.toString() === two.toString()
}
export async function checkAccess (task: AccessCheckTask): Promise<boolean> {
  debug('AccessCheckTask', task)
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
  const { aclGraph, targetUrl, contextUrl } = await task.rdfLayer.readAcl(baseResourceUrl)
  const resourceIsTarget = urlEquals(baseResourceUrl, targetUrl)
  debug('calling allowedAgentsForModes', 'aclGraph', resourceIsTarget, targetUrl, contextUrl)

  const allowedAgentsForModes: AccessModes = await determineAllowedAgentsForModes({
    aclGraph,
    resourceIsTarget,
    targetUrl,
    contextUrl
  } as ModesCheckTask)
  debug('allowedAgentsForModes', allowedAgentsForModes)
  let requiredAccessModes
  if (resourceIsAclDocument) {
    requiredAccessModes = [ ACL.Control ]
  } else {
    requiredAccessModes = task.requiredAccessModes
  }
  let appendOnly = false

  // throw if agent or origin does not have access
  await Promise.all(requiredAccessModes.map(async (mode: URL) => {
    debug('required mode', mode)
    if (await modeAllowed(mode, allowedAgentsForModes, task.webId, task.origin, task.rdfLayer)) {
      debug(mode, 'is allowed!')
      return
    }
    debug(`mode ${mode} is not allowed, but checking for appendOnly now`)
    // SPECIAL CASE: append-only
    if (mode === ACL.Write && await modeAllowed(ACL.Append, allowedAgentsForModes, task.webId, task.origin, task.rdfLayer)) {
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
