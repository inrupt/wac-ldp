import Debug from 'debug'

import { ACL, RDF_TYPE } from './determineAllowedAgentsForModes'

const debug = Debug('DetermineAllowedModeForOrigin')

// Given an ACL graph, find out who controls the resource.
// Then for each of those, fetch the profile doc and look for acl:trustedApps.

export interface OriginCheckTask {
  origin: string,
  mode: string,
  resourceOwners: Array<string>
}

export async function determineAllowedModesForOrigin (task: OriginCheckTask): Promise<boolean> {
  return false
}
