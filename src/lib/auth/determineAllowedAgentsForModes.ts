import jwt from 'jsonwebtoken'
import Debug from 'debug'
import { WacLdpTask } from '../api/http/HttpParser'
import { ACL, FOAF, RDF } from '../rdf/rdf-constants'
import { Path } from '../storage/BlobTree'

const debug = Debug('DetermineAllowedAgentsForModes')

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

export const AGENT_CLASS_ANYBODY = FOAF.Agent
export const AGENT_CLASS_ANYBODY_LOGGED_IN = ACL.AuthenticatedAgent

export interface ModesCheckTask {
  aclGraph: any,
  targetUrl: URL,
  contextUrl: URL,
  resourceIsTarget: boolean
}

export interface AccessModes {
  read: Array<URL>
  write: Array<URL>
  append: Array<URL>
  control: Array<URL>
}

function fetchGroupMembers (groupUri: string) {
  // TODO: implement
  return []
}

function stripTrailingSlash (str: string) {
  if (str.substr(-1) === '/') {
    return str.substring(0, str.length - 1)
  }
  return str
}
function urlsEquivalent (grantUrl: URL, targetURL: URL): boolean {
  debug('urlsEquivalent', grantUrl.toString(), targetURL.toString())

  return (stripTrailingSlash(grantUrl.toString()) === stripTrailingSlash(targetURL.toString()))
}

export async function determineAllowedAgentsForModes (task: ModesCheckTask): Promise<AccessModes> {
  const accessPredicate = (task.resourceIsTarget ? ACL.accessTo : ACL.default)
  // debug('task', task)
  const isAuthorization: { [subject: string]: boolean } = {}
  const aboutAgents: { [subject: string]: { [agentId: string]: boolean} | undefined } = {}
  const aboutThisResource: { [subject: string]: boolean } = {}
  const aboutMode: { [mode: string]: { [subject: string]: boolean} | undefined } = {
    [ACL.Read]: {},
    [ACL.Write]: {},
    [ACL.Append]: {},
    [ACL.Control]: {}
  }

  function addAgents (subject: string, agents: Array<string>) {
    if (typeof aboutAgents[subject] === 'undefined') {
      aboutAgents[subject] = {}
    }
    agents.map(agent => {
      (aboutAgents[subject] as { [agent: string]: boolean })[agent] = true
    })
  }

  task.aclGraph.filter((quad: any): boolean => {
    // pass 1, sort all quads according to what they state about a subject
    if (quad.predicate.value === ACL.mode && typeof aboutMode[quad.object.value] === 'object') {
      debug('using quad for mode', quad.subject.value, quad.predicate.value, quad.object.value)
      ;(aboutMode[quad.object.value] as { [agent: string]: boolean })[quad.subject.value] = true
    } else if (quad.predicate.value === RDF.type && quad.object.value === ACL.Authorization) {
      debug('using quad for type', quad.subject.value, quad.predicate.value, quad.object.value)
      isAuthorization[quad.subject.value] = true
    } else if (quad.predicate.value === ACL.agent) {
      debug('using quad for agent', quad.subject.value, quad.predicate.value, quad.object.value)
      addAgents(quad.subject.value, [quad.object.value])
    } else if (quad.predicate.value === ACL.agentGroup) {
      debug('using quad for agentGroup', quad.subject.value, quad.predicate.value, quad.object.value)
      addAgents(quad.subject.value, fetchGroupMembers(quad.object.value))
    } else if (quad.predicate.value === ACL.agentClass) {
      debug('using quad for agentClass', quad.subject.value, quad.predicate.value, quad.object.value)
      if ([AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN].indexOf(quad.object.value) !== -1) {
        debug('using quad for agentClass', quad.subject.value, quad.predicate.value, quad.object.value)
        addAgents(quad.subject.value, [quad.object.value])
      } else {
        debug('rejecting quad for agentClass', quad.subject.value, quad.predicate.value, quad.object.value)
      }
    } else if (quad.predicate.value === accessPredicate) {
      // Three cases: adjacent (doc), adjacent (container), non-adjacent (parent):
      // * resource https://example.com/c1/c2/c3/doc
      //  * target https://example.com/c1/c2/c3/doc, acl doc https://example.com/c1/c2/c3/doc.acl (adjacent, doc)
      //  * target https://example.com/c1/c2/c3/, acl doc https://example.com/c1/c2/c3/.acl (non-adjacent, parent)
      //  * target https://example.com/c1/c2/, acl doc https://example.com/c1/c2/.acl  (non-adjacent, parent)
      //  * target https://example.com/c1/ acl doc https://example.com/c1/.acl (non-adjacent, parent)
      //  * target https://example.com/, acl doc https://example.com/.acl (non-adjacent, parent)
      // * resource https://example.com/c1/c2/c3/c4/ (non-adjacent, parent)
      //  * target https://example.com/c1/c2/c3/c4/, acl doc https://example.com/c1/c2/c3/c4/.acl (adjacent, container)
      //  * target https://example.com/c1/c2/c3/, acl doc https://example.com/c1/c2/c3/.acl (non-adjacent, parent)
      //  * target https://example.com/c1/c2/, acl doc https://example.com/c1/c2/.acl (non-adjacent, parent)
      //  * target https://example.com/c1/ acl doc https://example.com/c1/.acl (non-adjacent, parent)
      //  * target https://example.com/, acl doc https://example.com/.acl (non-adjacent, parent)
      const valueUrl = new URL(quad.object.value, task.contextUrl)
      if (urlsEquivalent(task.targetUrl, valueUrl)) {
        debug('using quad for path', quad.subject.value, quad.predicate.value, quad.object.value)
        aboutThisResource[quad.subject.value] = true
      } else {
        debug('rejecting quad for path', quad.subject.value, quad.predicate.value, quad.object.value)
      }
    } else {
      debug('rejecting quad', quad.subject.value, quad.predicate.value, quad.object.value)
    }
    // debug('aboutThisResource - ', quad.predicate.value, accessPredicate, quad.object.value, task.resourcePath)
    return false
  })

  debug(isAuthorization, aboutAgents, aboutThisResource, aboutMode)
  // pass 2, find the subjects for which all boxes are checked, and add up modes from them
  function determineModeAgents (mode: string): Array<URL> {
    debug('determineModeAgents A', mode)
    let anybody = false
    let anybodyLoggedIn = false
    const agentsMap: { [agent: string]: boolean } = {}
    for (const subject in aboutMode[mode]) {
      debug('determineModeAgents B', mode, subject, isAuthorization[subject], aboutThisResource[subject])
      if ((isAuthorization[subject]) && (aboutThisResource[subject])) {
        debug('determineModeAgents C', mode, subject)
        Object.keys(aboutAgents[subject] as any).map(agentId => {
          if (anybody) {
            debug('determineModeAgents D', mode, subject)
            return
          }
          debug('determineModeAgents E', mode, subject)
          if (agentId === AGENT_CLASS_ANYBODY) {
            debug(mode, 'considering agentId', agentId, 'case 1')
            anybody = true
          } else if (agentId === AGENT_CLASS_ANYBODY_LOGGED_IN) {
            debug(mode, 'considering agentId', agentId, 'case 2')
            anybodyLoggedIn = true
          } else {
            debug(mode, 'considering agentId', agentId, 'case 3')
            agentsMap[agentId] = true
          }
        })
      }
    }
    if (anybody) {
      debug(mode, 'anybody')
      return [new URL(AGENT_CLASS_ANYBODY)]
    }
    if (anybodyLoggedIn) {
      debug(mode, 'anybody logged in')
      return [new URL(AGENT_CLASS_ANYBODY_LOGGED_IN)]
    }
    debug(mode, 'specific webIds', Object.keys(agentsMap))
    return Object.keys(agentsMap).map(str => new URL(str))
  }
  return {
    read: determineModeAgents(ACL.Read),
    write: determineModeAgents(ACL.Write),
    append: determineModeAgents(ACL.Append),
    control: determineModeAgents(ACL.Control)
  }
}
