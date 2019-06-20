import fetch from 'node-fetch'
import Debug from 'debug'
import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'
import convert from 'buffer-to-stream'

import { Path, BlobTree, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { ResourceData, streamToObject, determineRdfType, RdfType } from './ResourceDataUtils'
import { Container } from '../storage/Container'
import { setRootAcl } from './setRootAcl'
import { WacLdpTask } from '../api/http/HttpParser'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'

const debug = Debug('RdfLayer')

export const ACL_SUFFIX = '.acl'

export function getEmptyGraph () {
  return rdf.dataset()
}

function readRdf (rdfType: RdfType | undefined, bodyStream: ReadableStream) {
  let parser
  switch (rdfType) {
    case RdfType.JsonLd:
      debug('RdfType JSON-LD')
      parser = new JsonLdParser({
        factory: rdf
      })
      break
    case RdfType.Turtle:
    default:
      debug('RdfType N3')
      parser = new N3Parser({
        factory: rdf
      })
      break
  }
  debug('importing bodystream')
  return parser.import(bodyStream)
}

async function getGraphLocal (blob: Blob): Promise<any> {
  const stream = await blob.getData()
  debug('stream', typeof stream)
  let resourceData
  if (stream) {
    resourceData = await streamToObject(stream) as ResourceData
  } else {
    return getEmptyGraph()
  }
  debug('got ACL ResourceData', resourceData)

  const bodyStream = convert(Buffer.from(resourceData.body))

  const quadStream = readRdf(resourceData.rdfType, bodyStream)
  return rdf.dataset().import(quadStream)
}

export class RdfLayer {
  serverHost: string
  storage: BlobTree
  constructor (serverHost: string, storage: BlobTree) {
    this.serverHost = serverHost
    this.storage = storage
  }
  setRootAcl (owner: URL) {
    return setRootAcl(this.storage, owner.toString(), new URL(this.serverHost))
  }
  getLocalBlob (url: URL): Blob {
    const path: Path = urlToPath(url)
    return this.storage.getBlob(path)
  }
  getLocalContainer (url: URL): Container {
    const path: Path = urlToPath(url)
    return this.storage.getContainer(path)
  }
  async fetchGraph (url: URL) {
    if (url.host === this.serverHost) {
      const blob: Blob = this.getLocalBlob(url)
      debug('fetching graph locally')
      return getGraphLocal(blob)
    } else {
      debug('calling node-fetch', url.toString())
      const response: any = await fetch(url.toString())
      const rdfType = determineRdfType(response.headers.get('content-type'))
      const quadStream = readRdf(rdfType, response as unknown as ReadableStream)
      const dataset = await rdf.dataset().import(quadStream)
      debug('got dataset')
      return dataset
    }
  }
  async getResourceData (url: URL): Promise<ResourceData | undefined> {
    debug('getResourceData!', url.toString())
    const blob: Blob = this.getLocalBlob(url)
    const data = await blob.getData()
    if (data) {
      return streamToObject(data)
    }
  }
  setData (url: URL, stream: ReadableStream) {
    const blob: Blob = this.getLocalBlob(url)
    return blob.setData(stream)
  }

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
  async readAcl (resourceUrl: URL): Promise<{ aclGraph: any, targetUrl: URL, contextUrl: URL }> {
    debug('readAcl', resourceUrl.toString())
    const resourcePath = urlToPath(resourceUrl)
    let currentGuessPath = resourcePath
    let currentIsContainer = resourcePath.isContainer
    let aclDocPath = (resourcePath.isContainer ? currentGuessPath.toChild(ACL_SUFFIX, false) : currentGuessPath.appendSuffix(ACL_SUFFIX))
    debug('aclDocPath from resourcePath', resourcePath, aclDocPath)
    let isAdjacent = true
    let currentGuessBlob = this.storage.getBlob(aclDocPath)
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
      currentGuessBlob = this.storage.getBlob(aclDocPath)
      currentGuessBlobExists = await currentGuessBlob.exists()
      debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
    }
    return {
      aclGraph: await getGraphLocal(currentGuessBlob),
      targetUrl: currentGuessPath.toUrl(),
      contextUrl: aclDocPath.toUrl()
    }
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
