import jwt from 'jsonwebtoken'
import Debug from 'debug'
import { WacLdpTask } from '../api/http/HttpParser'

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

export async function determineAllowedModesForAgent (task: AgentCheckTask): Promise<AccessModes> {
  return {
    read: false,
    write: false,
    append: false,
    control: false
  }
}
