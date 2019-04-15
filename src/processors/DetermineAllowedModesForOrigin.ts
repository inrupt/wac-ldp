import jose from 'node-jose'
import jws from 'jws'
import jwt from 'jsonwebtoken'
import Processor from './Processor'
import Debug from 'debug'
import { LdpTask } from './LdpParser'
import StorageProcessor from './StorageProcessor'
import { AccessMode } from './DetermineAllowedModesForAgent'

const debug = Debug('DetermineAllowedModeForAgent')

export interface OriginCheckTask {
  origin: string,
  aclGraph: any
}

export class DetermineAllowedModeForOrigin extends StorageProcessor implements Processor {
  async process (task: OriginCheckTask): Promise<Array<AccessMode>> {
    return []
  }
}
