import jwt from 'jsonwebtoken'
import Debug from 'debug'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('DetermineAllowedModeForAgent')

function ACL (str: string) {
  return 'http://www.w3.org/ns/auth/acl#' + str
}

export interface AgentCheckTask {
  agent: string,
  aclGraph: any,
  isAdjacent: boolean,
  resourcePath: string
}

export interface AccessModes {
  read: Boolean
  write: Boolean
  append: Boolean
  control: Boolean
}

function filterOnAgent (agent: string, dataset: any) {
  const subjectsForAgent = {}
  dataset.filter((quad: any): boolean => {
    if (quad.predicate.value === 'http://www.w3.org/ns/auth/acl#agent' && quad.object.value === agent) {
      subjectsForAgent[quad.subject.value] = true
    }
    return false
  })
  return dataset.filter((quad: any): boolean => {
    return subjectsForAgent[quad.subject.value]
  })
}

function filterOnResource (resourcePath: string, accessPredicate: string, dataset: any) {
  const subjectsForResource = {}
  dataset.filter((quad: any): boolean => {
    if (quad.predicate.value === accessPredicate && quad.object.value === resourcePath) {
      subjectsForResource[quad.subject.value] = true
    }
    return false
  })
  return dataset.filter((quad: any): boolean => {
    return subjectsForResource[quad.subject.value]
  })
}

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

export async function determineAllowedModesForAgent (task: AgentCheckTask): Promise<AccessModes> {
  const accessPredicate = (task.isAdjacent ? ACL('accessTo') : ACL('default'))
  debug('task', task)
  const aboutThisAgent = filterOnAgent(task.agent, task.aclGraph)
  debug('aboutThisAgent', aboutThisAgent)
  const aboutThisResource = filterOnResource(task.resourcePath, accessPredicate, aboutThisAgent)
  debug('aboutThisResource', aboutThisResource)
  const modes: Array<string> = filterModes(aboutThisResource)
  debug('modes in determineAllowedModesForAgent', modes)
  return {
    read: modes.indexOf(ACL('Read')) !== -1,
    write: modes.indexOf(ACL('Write')) !== -1,
    append: modes.indexOf(ACL('Append')) !== -1,
    control: modes.indexOf(ACL('Control')) !== -1
  }
}
