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

export interface AccessModes {
  read: Boolean
  write: Boolean
  append: Boolean
  control: Boolean
}

export class DetermineAllowedModeForAgent extends StorageProcessor implements Processor {
  async process (task: AgentCheckTask): Promise<AccessModes> {
    return {
      read: false,
      write: false,
      append: false,
      control: false
    }
  }
}
