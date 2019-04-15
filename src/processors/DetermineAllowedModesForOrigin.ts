import jose from 'node-jose'
import jws from 'jws'
import jwt from 'jsonwebtoken'
import Processor from './Processor'
import Debug from 'debug'
import { LdpTask } from './LdpParser'
import StorageProcessor from './StorageProcessor'
import { AccessModes } from './DetermineAllowedModesForAgent'

const debug = Debug('DetermineAllowedModeForAgent')

export interface OriginCheckTask {
  origin: string,
  aclGraph: any
}

export class DetermineAllowedModeForOrigin extends StorageProcessor implements Processor {
  async process (task: OriginCheckTask): Promise<AccessModes> {
    return {
      read: false,
      write: false,
      append: false,
      control: false
    }
  }
}
