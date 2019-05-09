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

// this module should act on the resource path (not the request path) and
// filter on acl:default and just give the ACL triples that
// apply for the resource path, so that the acl path becomes irrelevant
// from there on.

import Debug from 'debug'
import { getGraphLocal, getEmptyGraph } from '../rdf/getGraph'
import { Path, BlobTree } from '../storage/BlobTree'

const debug = Debug('readAcl')

export const ACL_SUFFIX = '.acl'

export async function readAcl (resourcePath: Path, resourceIsContainer: boolean, storage: BlobTree) {
  let currentGuessPath = resourcePath
  let currentIsContainer = resourceIsContainer
  let aclDocPath = (resourceIsContainer ? currentGuessPath.toChild(ACL_SUFFIX) : currentGuessPath.appendSuffix(ACL_SUFFIX))
  let isAdjacent = true
  let currentGuessBlob = storage.getBlob(aclDocPath)
  let currentGuessBlobExists = await currentGuessBlob.exists()
  debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
  while (!currentGuessBlobExists) {
    if (currentGuessPath.isRoot()) {
      // root ACL, nobody has access:
      return { aclGraph: getEmptyGraph(), topicPath: currentGuessPath, isAdjacent }
    }
    currentGuessPath = currentGuessPath.toParent()
    isAdjacent = false
    currentIsContainer = true
    aclDocPath = (currentIsContainer ? currentGuessPath.toChild(ACL_SUFFIX) : currentGuessPath.appendSuffix(ACL_SUFFIX))
    currentGuessBlob = storage.getBlob(aclDocPath)
    currentGuessBlobExists = await currentGuessBlob.exists()
    debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
  }
  return {
    aclGraph: await getGraphLocal(currentGuessBlob),
    topicPath: currentGuessBlob,
    isAdjacent
  }
}

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
