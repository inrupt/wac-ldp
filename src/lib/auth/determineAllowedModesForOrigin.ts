import Debug from 'debug'

import { AccessModes } from './determineAllowedModesForAgent'

export interface OriginCheckTask {
  origin: string,
  aclGraph: any
}

export async function determineAllowedModesForOrigin (task: OriginCheckTask): Promise<AccessModes> {
  return {
    read: false,
    write: false,
    append: false,
    control: false
  }
}
