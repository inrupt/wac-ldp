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
import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import convert from 'buffer-to-stream'

import { Path, BlobTree } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { ResourceData, makeResourceData, streamToObject } from '../rdf/ResourceDataUtils'

const debug = Debug('readAcl')

export const ACL_SUFFIX = '.acl'

async function getAclBlob (resourcePath: Path, resourceIsContainer: boolean, storage: BlobTree): Promise<{ aclResourceData: ResourceData, topicPath: Path, isAdjacent: boolean }> {
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
      return { aclResourceData: makeResourceData('text/turtle', ''), topicPath: currentGuessPath, isAdjacent }
    }
    currentGuessPath = currentGuessPath.toParent()
    isAdjacent = false
    currentIsContainer = true
    aclDocPath = (currentIsContainer ? currentGuessPath.toChild(ACL_SUFFIX) : currentGuessPath.appendSuffix(ACL_SUFFIX))
    currentGuessBlob = storage.getBlob(aclDocPath)
    currentGuessBlobExists = await currentGuessBlob.exists()
    debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
  }
  const stream = await currentGuessBlob.getData()
  debug('stream', typeof stream)
  if (stream) {
    return { aclResourceData: await streamToObject(stream) as ResourceData, topicPath: currentGuessPath, isAdjacent }
  }
  return { aclResourceData: makeResourceData('text/turtle', ''), topicPath: currentGuessPath, isAdjacent }
}

export async function readAcl (resourcePath: Path, resourceIsContainer: boolean, storage: BlobTree) {
  const { aclResourceData, topicPath, isAdjacent } = await getAclBlob(resourcePath, resourceIsContainer, storage)
  let parser = new N3Parser({
    factory: rdf
  })
  debug('got ACL ResourceData', aclResourceData)
  const bodyStream = convert(Buffer.from(aclResourceData.body))
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  return {
    aclGraph: dataset,
    topicPath,
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
