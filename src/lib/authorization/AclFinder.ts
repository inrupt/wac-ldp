import Debug from 'debug'
import { urlToPath } from '../storage/BlobTree'
import { StoreManager, getEmptyGraph, getGraphLocal } from '../rdf/StoreManager'

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
export async function readAcl (resourceUrl: URL, storeManager: StoreManager): Promise<{ aclGraph: any, targetUrl: URL, contextUrl: URL }> {
  debug('readAcl', resourceUrl.toString())
  const resourcePath = urlToPath(resourceUrl)
  let currentGuessPath = resourcePath
  let currentIsContainer = resourcePath.isContainer
  let aclDocPath = (resourcePath.isContainer ? currentGuessPath.toChild(ACL_SUFFIX, false) : currentGuessPath.appendSuffix(ACL_SUFFIX))
  debug('aclDocPath from resourcePath', resourcePath, aclDocPath)
  let isAdjacent = true
  let currentGuessBlob = storeManager.storage.getBlobAtPath(aclDocPath)
  let currentGuessBlobExists = await currentGuessBlob.exists()
  debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
  while (!currentGuessBlobExists) {
    if (currentGuessPath.isRoot()) {
      // root ACL, nobody has access:
      return { aclGraph: getEmptyGraph(), targetUrl: currentGuessPath.toUrl(), contextUrl: aclDocPath.toUrl() }
    }
    currentGuessPath = currentGuessPath.toParent()
    isAdjacent = false
    currentIsContainer = true
    aclDocPath = (currentIsContainer ? currentGuessPath.toChild(ACL_SUFFIX, false) : currentGuessPath.appendSuffix(ACL_SUFFIX))
    currentGuessBlob = storeManager.storage.getBlobAtPath(aclDocPath)
    currentGuessBlobExists = await currentGuessBlob.exists()
    debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
  }
  return {
    aclGraph: await getGraphLocal(currentGuessBlob),
    targetUrl: currentGuessPath.toUrl(),
    contextUrl: aclDocPath.toUrl()
  }
}
