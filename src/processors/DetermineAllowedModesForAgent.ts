import jose from 'node-jose'
import jws from 'jws'
import jwt from 'jsonwebtoken'
import Processor from './Processor'
import Debug from 'debug'
import { LdpTask } from './LdpParser'
import StorageProcessor from './StorageProcessor'

const debug = Debug('DetermineAllowedModeForAgent')

export interface AgentCheckTask {
  agent: string,
  aclGraph: any
}

export enum AccessMode {
  read,
  write,
  append,
  control
}

export class DetermineAllowedModeForAgent extends StorageProcessor implements Processor {
  async process (task: AgentCheckTask): Promise<Array<AccessMode>> {
    return []
  }
}
