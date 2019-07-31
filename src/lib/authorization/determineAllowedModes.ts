import Debug from 'debug'
import { ACL, FOAF, RDF, VCARD } from '../rdf/rdf-constants'
import { StoreManager } from '../rdf/StoreManager'
import { urlToRdfNode, rdfNodeToUrl, RdfNode, stringToRdfNode } from '../rdf/RdfLibStoreManager'
import { urlToDocUrl } from './appIsTrustedForMode'

const debug = Debug('DetermineAllowedModes')

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
  targetUrl: URL
  contextUrl: URL
  resourceIsTarget: boolean
  webId: URL | undefined
  origin: string | undefined
  storeManager: StoreManager
}

const ACL_READ = ACL.Read.toString()
const ACL_WRITE = ACL.Write.toString()
const ACL_APPEND = ACL.Append.toString()
const ACL_CONTROL = ACL.Control.toString()

export interface ModesMask {
  [index: string]: boolean
}

async function fetchGroupMembers (groupUri: URL, storeManager: StoreManager): Promise<Array<RdfNode>> {
  debug('fetchGroupMembers', groupUri.toString())
  const groupUriNode = urlToRdfNode(groupUri)
  const groupUriDoc = urlToDocUrl(groupUri)
  const groupUriDocNode = urlToRdfNode(groupUriDoc)
  // await storeManager.load(groupUri)
  const memberNodes = await storeManager.objectsMatching({
    subject: groupUriNode,
    predicate: urlToRdfNode(VCARD.hasMember),
    why: groupUriDocNode
  })
  debug(memberNodes)
  return memberNodes
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

export async function determineAllowedModes (task: ModesCheckTask): Promise<ModesMask> {
  const accessPredicate: string = (task.resourceIsTarget ? ACL.accessTo.toString() : ACL.default.toString())
  // debug('task', task)
  const authorizationNodes: Array<RdfNode> = await task.storeManager.subjectsMatching({
    predicate: urlToRdfNode(RDF.type),
    object: urlToRdfNode(ACL.Authorization),
    why: urlToRdfNode(task.contextUrl)
  })
  let agentNodes: Array<RdfNode> = [ urlToRdfNode(AGENT_CLASS_ANYBODY) ]
  if (task.webId) {
    agentNodes.push(urlToRdfNode(AGENT_CLASS_ANYBODY_LOGGED_IN))
    agentNodes.push(urlToRdfNode(task.webId))
  }
  const authorizationNodesAboutAgent = await task.storeManager.subjectsMatching({
    subject: authorizationNodes,
    predicate: urlToRdfNode(ACL.agent),
    object: agentNodes,
    why: urlToRdfNode(task.contextUrl)
  })
  const alsoAboutTargetResource = await task.storeManager.subjectsMatching({
    subject: authorizationNodesAboutAgent,
    predicate: stringToRdfNode(accessPredicate),
    object: urlToRdfNode(task.targetUrl),
    why: urlToRdfNode(task.contextUrl)
  })
  const modes = await task.storeManager.objectsMatching({
    subject: alsoAboutTargetResource,
    predicate: urlToRdfNode(ACL.mode),
    why: urlToRdfNode(task.contextUrl)
  })
  let ret = {
    ACL_READ: false,
    ACL_WRITE: false,
    ACL_APPEND: false,
    ACL_CONTROL: false
  } as ModesMask
  modes.map((node: RdfNode) => {
    ret[rdfNodeToUrl(node).toString()] = true
  })
  return ret
}
