import Debug from 'debug'

import { ACL, RDF } from '../rdf/rdf-constants'

const debug = Debug('DetermineAllowedModeForOrigin')

// Given an ACL graph, find out who controls the resource.
// Then for each of those, fetch the profile doc and look for acl:trustedApps.

export interface OriginCheckTask {
  origin: string,
  mode: string,
  resourceOwners: Array<string>
}

export async function appIsTrustedForMode (task: OriginCheckTask): Promise<boolean> {
  // FIXME: implement
  return true
}
