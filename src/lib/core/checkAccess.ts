
import { OriginCheckTask, appIsTrustedForMode } from '../auth/appIsTrustedForMode'
import { ModesCheckTask, determineAllowedAgentsForModes, ACL, AccessModes, AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN } from '../auth/determineAllowedAgentsForModes'
import { determineWebId } from '../auth/determineWebId'
import { readAcl, ACL_SUFFIX } from '../auth/readAcl'
import { Path, BlobTree } from '../storage/BlobTree'
import Debug from 'debug'
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ErrorResult, ResultType } from '../api/http/HttpResponder'

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

export async function checkAccess (wacLdpTask: WacLdpTask, aud: string, storage: BlobTree) {
  const webId = await determineWebId(wacLdpTask.bearerToken, aud)
  debug('webId', webId)

  let baseResourcePath: Path
  let resourceIsAclDocument
  if (wacLdpTask.path.hasSuffix(ACL_SUFFIX)) {
    // editing an ACL file requires acl:Control on the base resource
    baseResourcePath = wacLdpTask.path.removeSuffix(ACL_SUFFIX)
    resourceIsAclDocument = true
  } else {
    baseResourcePath = wacLdpTask.path
    resourceIsAclDocument = false
  }
  const aclGraph = await readAcl(baseResourcePath, wacLdpTask.isContainer, storage)
  debug('aclGraph', aclGraph)

  const allowedAgentsForModes: AccessModes = await determineAllowedAgentsForModes({
    aclGraph
  } as ModesCheckTask)
  debug('allowedAgentsModes', allowedAgentsForModes)
  const requiredAccessModes = determineRequiredAccessModes(wacLdpTask.wacLdpTaskType, resourceIsAclDocument)
  let appendOnly = false

  async function modeAllowed (mode: string): Promise<boolean> {
    // first check agent:
    const agents = (allowedAgentsForModes as any)[mode]
    debug(mode, agents)
    if ((agents.indexOf(AGENT_CLASS_ANYBODY) === -1) &&
        (agents.indexOf(AGENT_CLASS_ANYBODY_LOGGED_IN) === -1) &&
        (agents.indexOf(webId) === -1)) {
      return false
    }
    // then check origin:
    return appIsTrustedForMode({
      origin: wacLdpTask.origin,
      mode: ACL(mode),
      resourceOwners: allowedAgentsForModes.control
    } as OriginCheckTask)
  }

  // throw if agent or origin does not have access
  requiredAccessModes.map((mode: string) => {
    if (modeAllowed(mode)) {
      return
    }
    // SPECIAL CASE: append-only
    if (mode === 'write' && modeAllowed('append')) {
      appendOnly = true
      return
    }
    debug(`Access denied! ${mode} access is required for this task, webid is "${webId}"`)
    throw new ErrorResult(ResultType.AccessDenied)
  })
  // webId may be reused to check individual ACLs on individual member resources for Glob
  // appendOnly may be used to restrict PATCH operations
  return { webId, appendOnly }
}
