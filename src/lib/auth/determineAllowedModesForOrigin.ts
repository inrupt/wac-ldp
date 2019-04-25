import Debug from 'debug'

import { AccessModes } from './determineAllowedModesForAgent'

export interface OriginCheckTask {
  origin: string,
  aclGraph: any
}
//
function filterModes (dataset: any): Array<string> {
  const modes: Array<string> = []
  dataset.filter((quad: any): boolean => {
    if (quad.predicate.value === ACL('mode')) {
      modes.push(quad.object.value)
    }
    return false
  })
  debug('got modes!', modes)
  return modes
}

export async function determineAllowedModesForOrigin (task: OriginCheckTask): Promise<AccessModes> {
  return {
    read: false,
    write: false,
    append: false,
    control: false
  }
}
