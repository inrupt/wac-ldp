
import { OriginCheckTask, appIsTrustedForMode } from './appIsTrustedForMode'
import { ModesCheckTask, determineAllowedModes as determineAllowedModesForAgent, AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN, ModesMask } from './determineAllowedModes'
import { ACL } from '../rdf/rdf-constants'
import Debug from 'debug'
import { TaskType } from '../api/http/HttpParser'
import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { StoreManager } from '../rdf/StoreManager'
import { ACL_SUFFIX, AclManager } from './AclManager'

const debug = Debug('checkAccess')

export interface AccessCheckTask {
  url: URL
  webId: URL | undefined
  origin: string
  requiredAccessModes: Array<URL>
  storeManager: StoreManager
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
  debug('AccessCheckTask', task.url.toString(), task.webId ? task.webId.toString() : undefined, task.origin)
  debug(task.requiredAccessModes.map(url => url.toString()))
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
  const aclManager = new AclManager(task.storeManager)
  const { targetUrl, contextUrl } = await aclManager.readAcl(baseResourceUrl)
  const resourceIsTarget = urlEquals(baseResourceUrl, targetUrl)
  debug('calling allowedAgentsForModes', 'aclGraph', resourceIsTarget, targetUrl.toString(), contextUrl.toString())

  const allowedModes: ModesMask = await determineAllowedModesForAgent({
    resourceIsTarget,
    targetUrl,
    contextUrl,
    webId: task.webId,
    origin: task.origin
  } as ModesCheckTask)
  debug('allowedAgentsForModes')
  let requiredAccessModes
  if (resourceIsAclDocument) {
    requiredAccessModes = [ ACL.Control ]
  } else {
    requiredAccessModes = task.requiredAccessModes
  }
  let appendOnly = false

  // throw if agent or origin does not have access
  await Promise.all(requiredAccessModes.map(async (mode: URL) => {
    debug('required mode', mode.toString())
    if (allowedModes[mode.toString()]) {
      debug(mode, 'is allowed!')
      return
    }
    debug(`mode ${mode.toString()} is not allowed, but checking for appendOnly now`)
    // SPECIAL CASE: append-only
    if (mode === ACL.Write && allowedModes[ACL.Append.toString()]) {
      appendOnly = true
      debug('write was requested and is not allowed but append is; setting appendOnly to true')
      return
    }
    debug(`Access denied! ${mode.toString()} access is required for this task, webid is "${task.webId ? task.webId.toString() : undefined}"`)
    throw new ErrorResult(ResultType.AccessDenied)
  }))
  // webId may be reused to check individual ACLs on individual member resources for Glob
  // appendOnly may be used to restrict PATCH operations
  return appendOnly
}
