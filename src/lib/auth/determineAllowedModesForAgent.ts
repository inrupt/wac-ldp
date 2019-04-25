import jwt from 'jsonwebtoken'
import Debug from 'debug'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('DetermineAllowedModeForAgent')

// Given an ACL graph, find out which access modes a certain agent should get.
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

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
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

export async function determineAllowedModesForAgent (task: AgentCheckTask): Promise<AccessModes> {
  const accessPredicate = (task.isAdjacent ? ACL('accessTo') : ACL('default'))
  debug('task', task)
  const isAuthorization = {}
  const aboutThisAgent = {}
  const aboutThisResource = {}
  const aboutMode = {
    [ACL('Read')]: {},
    [ACL('Write')]: {},
    [ACL('Append')]: {},
    [ACL('Control')]: {}
  }
  task.aclGraph.filter((quad: any): boolean => {
    debug('using quad', quad.subject.value, quad.predicate.value, quad.object.value)
    // pass 1, sort all quads according to what they state about a subject
    if (quad.predicate.value === ACL('mode') && typeof aboutMode[quad.object.value] === 'object') {
      aboutMode[quad.object.value][quad.subject.value] = true
    } else if (quad.predicate.value === RDF_TYPE && quad.object.value === ACL('Authorization')) {
      isAuthorization[quad.subject.value] = true
    } else if (quad.predicate.value === ACL('agent') && quad.object.value === task.agent) {
      aboutThisAgent[quad.subject.value] = true
    } else if (quad.predicate.value === accessPredicate && quad.object.value === task.resourcePath) {
      aboutThisResource[quad.subject.value] = true
    }
    return false
  })
  debug(isAuthorization, aboutThisAgent, aboutThisResource, aboutMode)
  // pass 2, find the subjects for which all boxes are checked, and add up modes from them
  function determineMode (mode: string): boolean {
    for (const subject in aboutMode[mode]) {
      if ((isAuthorization[subject]) && (aboutThisAgent[subject]) && (aboutThisResource[subject])) {
        return true
      }
    }
    return false
  }
  return {
    read: determineMode(ACL('Read')),
    write: determineMode(ACL('Write')),
    append: determineMode(ACL('Append')),
    control: determineMode(ACL('Control'))
  }
}
