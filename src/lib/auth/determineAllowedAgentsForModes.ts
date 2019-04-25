import jwt from 'jsonwebtoken'
import Debug from 'debug'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('DetermineAllowedAgentsModes')

// Given an ACL graph, find out which agents should get read, write, append, and/or control.
// If the ACL graph came from an adjacent ACL doc (so /foo.acl for /foo or /bar/.acl for /bar/),
// then the predicate we are looking for is `acl:accessTo`. If no adjacent ACL doc existed, and
// the ACL graph instead came from an ancestor container's ACL doc, then we are looking for
// `acl:default` instead.
// ACL rules are additive, and take the form:
// <#owner>
//   a acl:Authorization;
//   acl:agent <https://michielbdejong.inrupt.net/profile/card#me> ;
//   acl:accessTo </>;
//   acl:mode
//     acl:Read, acl:Write, acl:Control.
// There can also be acl:agentGroup, acl:agentClass foaf:Agent, and acl:agentClass acl:AuthenticatedAgent.
// The result is a list of strings for each of the four access modes, where each string can
// be a webid, or AGENT_CLASS_ANYBODY or AGENT_CLASS_ANYBODY_LOGGED_IN.

export function ACL (str: string) {
  return 'http://www.w3.org/ns/auth/acl#' + str
}
export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
export const AGENT_CLASS_ANYBODY = 'http://xmlns.com/foaf/0.1/Agent'
export const AGENT_CLASS_ANYBODY_LOGGED_IN = ACL('AuthenticatedAgent')

export interface ModesCheckTask {
  aclGraph: any,
  isAdjacent: boolean,
  resourcePath: string
}

export interface AccessModes {
  read: Array<string>
  write: Array<string>
  append: Array<string>
  control: Array<string>
}

function fetchGroupMembers (groupUri: string) {
  // TODO: implement
  return []
}

export async function determineAllowedAgentsForModes (task: ModesCheckTask): Promise<AccessModes> {
  const accessPredicate = (task.isAdjacent ? ACL('accessTo') : ACL('default'))
  debug('task', task)
  const isAuthorization = {}
  const aboutAgents = {}
  const aboutThisResource = {}
  const aboutMode = {
    [ACL('Read')]: {},
    [ACL('Write')]: {},
    [ACL('Append')]: {},
    [ACL('Control')]: {}
  }
  function addAgents (subject: string, agents: Array<string>) {
    if (typeof aboutAgents[subject] === 'undefined') {
      aboutAgents[subject] = {}
    }
    agents.map(agent => {
      aboutAgents[subject][agent] = true
    })
  }
  task.aclGraph.filter((quad: any): boolean => {
    debug('using quad', quad.subject.value, quad.predicate.value, quad.object.value)
    // pass 1, sort all quads according to what they state about a subject
    if (quad.predicate.value === ACL('mode') && typeof aboutMode[quad.object.value] === 'object') {
      aboutMode[quad.object.value][quad.subject.value] = true
    } else if (quad.predicate.value === RDF_TYPE && quad.object.value === ACL('Authorization')) {
      isAuthorization[quad.subject.value] = true
    } else if (quad.predicate.value === ACL('agent')) {
      addAgents(quad.subject.value, [quad.object.value])
    } else if (quad.predicate.value === ACL('agentGroup')) {
      addAgents(quad.subject.value, fetchGroupMembers(quad.object.value))
    } else if (quad.predicate.value === ACL('agentClass')) {
      if ([AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN].indexOf(quad.object.value) !== -1) {
        addAgents(quad.subject.value, [quad.object.value])
      }
    } else if (quad.predicate.value === accessPredicate && quad.object.value === task.resourcePath) {
      aboutThisResource[quad.subject.value] = true
    }
    return false
  })
  debug(isAuthorization, aboutAgents, aboutThisResource, aboutMode)
  // pass 2, find the subjects for which all boxes are checked, and add up modes from them
  function determineModeAgents (mode: string): Array<string> {
    let anybodyLoggedIn = false
    const agentsMap = {}
    for (const subject in aboutMode[mode]) {
      if ((isAuthorization[subject]) && (aboutThisResource[subject])) {
        Object.keys(aboutAgents[subject]).map(agentId => {
          if (agentId === AGENT_CLASS_ANYBODY) {
            return [AGENT_CLASS_ANYBODY]
          } else if (agentId === AGENT_CLASS_ANYBODY_LOGGED_IN) {
            anybodyLoggedIn = true
          } else {
            agentsMap[agentId] = true
          }
        })
      }
    }
    if (anybodyLoggedIn) {
      return [AGENT_CLASS_ANYBODY_LOGGED_IN]
    }
    return Object.keys(agentsMap)
  }
  return {
    read: determineModeAgents(ACL('Read')),
    write: determineModeAgents(ACL('Write')),
    append: determineModeAgents(ACL('Append')),
    control: determineModeAgents(ACL('Control'))
  }
}
