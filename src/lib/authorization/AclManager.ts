import Debug from 'debug'
import { StoreManager } from '../rdf/StoreManager'
import { makeResourceData, bufferToStream, ResourceData, ResourceType } from '../rdf/ResourceDataUtils'

// Example ACL file, this one is on https://michielbdejong.inrupt.net/.acl:

// # Root ACL resource for the user account
// @prefix acl: <http://www.w3.org/ns/auth/acl#>.

// <#owner>
//     a acl:Authorization;

//     acl:agent <https://michielbdejong.inrupt.net/profile/card#me> ;

//     # Optional owner email, to be used for account recovery:
//     acl:agent <mailto:michiel@unhosted.org>;

//     # Set the access to the root storage folder itself
//     acl:accessTo </>;

//     # All resources will inherit this authorization, by default
//     acl:defaultForNew </>;

//     # The owner has all of the access modes allowed
//     acl:mode
//         acl:Read, acl:Write, acl:Control.

// # Data is private by default; no other agents get access unless specifically
// # authorized in other .acls
const debug = Debug('AclFinder')

export const ACL_SUFFIX = '.acl'

//  cases:
// * request path foo/bar/
// * resource path foo/bar/
//   * acl path foo/bar/.acl
//   * acl path foo/.acl (filter on acl:default)
// * request path foo/bar/baz
// * resource path foo/bar/baz
//   * acl path foo/bar/baz.acl
//   * acl path foo/bar/.acl (filter on acl:default)
// * request path foo/bar/.acl
// * resource path foo/bar/
//   * acl path foo/bar/.acl (look for acl:Control)
//   * acl path foo/.acl (filter on acl:default, look for acl:Control)
// * request path foo/bar/baz.acl
// * resource path foo/bar/baz
//   * acl path foo/bar/baz.acl (look for acl:Control)
//   * acl path foo/bar/.acl (filter on acl:default, look for acl:Control)

// this method should act on the resource path (not the request path) and
// filter on acl:default and just give the ACL triples that
// apply for the resource path, so that the acl path becomes irrelevant
// from there on.
// you could argue that readAcl should fetch ACL docs through graph fetcher and not directly
// from storage

function toChild (urlStr: string, childName: string, childIsContainer: boolean): string {
  let str = urlStr
  if (str.substr(-1) !== '/') {
    str += '/'
  }
  str += childName
  if (childIsContainer) {
    str += '/'
  }
  return str
}
function toParent (urlStr: string): string {
  let parts = urlStr.split('/')
  if (parts[parts.length - 1].length === 0) {
    return parts.slice(0, parts.length - 2).join('/')
  } else {
    return parts.slice(0, parts.length - 1).join('/')
  }
}
function appendSuffix (urlStr: string, suffix: string): string {
  return urlStr + suffix
}

export class AclManager {
  storeManager: StoreManager
  constructor (storeManager: StoreManager) {
    this.storeManager = storeManager
  }
  async readAcl (resourceUrl: URL): Promise<{ targetUrl: URL, contextUrl: URL }> {
    debug('readAcl', resourceUrl.toString())
    let currentGuessUrlStr: string = resourceUrl.toString()
    let resourceData: ResourceData = await this.storeManager.getResourceData(new URL(currentGuessUrlStr))
    let currentIsContainer = (resourceData.resourceType === ResourceType.LdpBc)
    let aclDocUrlStr: string = (currentIsContainer ? toChild(currentGuessUrlStr, ACL_SUFFIX, false) : appendSuffix(currentGuessUrlStr, ACL_SUFFIX))
    debug('aclDocPath from resourcePath', resourceUrl.toString(), aclDocUrlStr)
    let isAdjacent = true
    let currentGuessBlobExists = (resourceData.resourceType !== ResourceType.Missing)
    debug('aclDocPath', aclDocUrlStr, resourceData)
    while (!currentGuessBlobExists) {
      // if (/* metaData.isRoot() */ false) {
      //   // root ACL, nobody has access:
      //   return { aclGraph: getEmptyGraph(), targetUrl: currentGuessPath.toUrl(), contextUrl: aclDocPath.toUrl() }
      // }
      currentGuessUrlStr = toParent(currentGuessUrlStr)
      isAdjacent = false
      currentIsContainer = true
      aclDocUrlStr = (currentIsContainer ? toChild(currentGuessUrlStr, ACL_SUFFIX, false) : appendSuffix(currentGuessUrlStr, ACL_SUFFIX))
      debug('aclDocPath', aclDocUrlStr.toString(), resourceData)
    }
    return {
      targetUrl: new URL(currentGuessUrlStr),
      contextUrl: new URL(aclDocUrlStr)
    }
  }
  setRootAcl (storageRoot: URL, owner: URL): Promise<void> {
    let rootString = storageRoot.toString()
    if (rootString.substr(-1) !== '/') {
      rootString += '/'
    }
    const rootAclUrl = new URL(rootString + ACL_SUFFIX)

    const obj = makeResourceData('text/turtle', [
      `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
      `<#owner>`,
      `  a acl:Authorization;`,
      `  acl:agent <${owner.toString()}>;`,
      `  acl:accessTo </>;`,
      `  acl:default </>;`,
      `  acl:mode`,
      `    acl:Read, acl:Write, acl:Control.`
    ].join('\n'))
    const buffer = Buffer.from(JSON.stringify(obj))
    return this.storeManager.setRepresentation(rootAclUrl, bufferToStream(buffer))
  }
  setPublicAcl (containerUrl: URL, owner: URL, modeName: string): Promise<void> {
    let containerUrlStr = containerUrl.toString()
    if (containerUrlStr.substr(-1) !== '/') {
      containerUrlStr += '/'
    }
    const containerAclUrl = new URL(containerUrlStr + ACL_SUFFIX)

    const obj = makeResourceData('text/turtle', [
      `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
      `@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.`,
      `<#owner>`,
      `  a acl:Authorization;`,
      `  acl:agent <${owner.toString()}>;`,
      `  acl:accessTo <./>;`,
      `  acl:default <./>;`,
      `  acl:mode`,
      `    acl:Read, acl:Write, acl:Control.`,
      `<#public>`,
      `  a acl:Authorization;`,
      `  acl:agent foaf:Agent;`,
      `  acl:accessTo <./>;`,
      `  acl:default <./>;`,
      `  acl:mode`,
      `    acl:${modeName}.`
    ].join('\n'))
    const buffer = Buffer.from(JSON.stringify(obj))
    return this.storeManager.setRepresentation(containerAclUrl, bufferToStream(buffer))
  }
}
