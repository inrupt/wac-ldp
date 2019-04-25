
import { OriginCheckTask, determineAllowedModesForOrigin } from '../auth/determineAllowedModesForOrigin'
import { ModesCheckTask, determineAllowedAgentsForModes, ACL, AccessModes } from '../auth/determineAllowedAgentsForModes'
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

  const allowedAgentsForModes: AccessModes = await determineAllowedAgentsForModes({
    aclGraph
  } as ModesCheckTask)
  debug('allowedModesForAgent', allowedAgentsForModes)

  const allowedModesForOrigin: {[mode: string]: boolean} = {}
  const ret = Promise.all(['Read', 'Write', 'Append', 'Control'].map(async (mode: string): Promise<void> => {
    allowedModesForOrigin[ACL(mode)] = await determineAllowedModesForOrigin({
      origin: ldpTask.origin,
      mode: ACL(mode),
      resourceOwners: allowedAgentsForModes.control
    } as OriginCheckTask)
    return
  }))
  debug('allowedModesForOrigin', allowedModesForOrigin)
  return ret
}
