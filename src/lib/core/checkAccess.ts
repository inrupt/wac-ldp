
import { OriginCheckTask, determineAllowedModesForOrigin } from '../auth/determineAllowedModesForOrigin'
import { AgentCheckTask, determineAllowedModesForAgent } from '../auth/determineAllowedModesForAgent'
import { determineWebId } from '../auth/determineWebId'
import { readAcl, ACL_SUFFIX } from '../auth/readAcl'
import { Path, BlobTree } from '../storage/BlobTree'
import Debug from 'debug'
import { WacLdpTask } from '../api/http/HttpParser'
const debug = Debug('checkAccess')

export async function checkAccess (ldpTask: WacLdpTask, aud: string, storage: BlobTree) {
  const webId = await determineWebId(ldpTask.bearerToken, aud)
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
  const aclGraph = await readAcl(baseResourcePath, ldpTask.isContainer, storage)
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
}
