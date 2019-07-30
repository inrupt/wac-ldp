import fetch from 'node-fetch'
import Debug from 'debug'
import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'
import convert from 'buffer-to-stream'
import * as rdflib from 'rdflib'

import { Path, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { ResourceData, streamToObject, determineRdfType, RdfType, makeResourceData, objectToStream, streamToBuffer } from './ResourceDataUtils'
import { Container } from '../storage/Container'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'

const debug = Debug('StoreManager')

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

export async function quadStreamFromBlob (blob: Blob): Promise<any> {
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
  return quadStream
}

export async function getGraphLocal (blob: Blob): Promise<any> {
  const quadStream = await quadStreamFromBlob(blob)
  return rdf.dataset().import(quadStream)
}

export class StoreManager {
  serverRootDomain: string
  storage: QuadAndBlobStore
  stores: { [url: string]: any }

  constructor (serverRootDomain: string, storage: QuadAndBlobStore) {
    if (serverRootDomain.indexOf('/') !== -1) {
      throw new Error('serverRootDomain should be just the FQDN, no https:// in front')
    }
    this.serverRootDomain = serverRootDomain
    this.storage = storage
    this.stores = {}
  }
  getLocalBlob (url: URL): Blob {
    return this.storage.getBlob(url)
  }
  getLocalContainer (url: URL): Container {
    return this.storage.getContainer(url)
  }
  async fetchGraph (url: URL) {
    if (url.host.endsWith(this.serverRootDomain)) {
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
  async statementsMatching (pattern: { s?: URL, p?: URL, o?: URL, g: URL }) {
    await this.load(pattern.g)
    return this.stores[pattern.g.toString()].statementsMatching(pattern.s, pattern.p, pattern.o, pattern.g)
  }
  async getRepresentation (url: URL): Promise<ResourceData | undefined> {
    debug('getResourceData - local?', url.host, this.serverRootDomain)
    if (url.host.endsWith(this.serverRootDomain)) {
      debug('getResourceData local!', url.toString())
      const blob: Blob = this.getLocalBlob(url)
      const data = await blob.getData()
      if (data) {
        return streamToObject(data)
      }
    } else {
      debug('calling node-fetch', url.toString())
      const response: any = await fetch(url.toString())
      const contentType = response.headers.get('content-type')
      const etag = response.headers.get('etag')
      const rdfType = determineRdfType(contentType)
      const body = (await streamToBuffer(response as unknown as ReadableStream)).toString()
      return { contentType, body, etag, rdfType }
    }
  }
  setData (url: URL, stream: ReadableStream) {
    const blob: Blob = this.getLocalBlob(url)
    return blob.setData(stream)
  }
  async createLocalDocument (url: URL, contentType: string, body: string) {
    return this.setData(url, objectToStream(makeResourceData(contentType, body)))
  }
  async load (url: URL) {
    if (this.stores[url.toString()]) {
      // to do: check if cache needs to be refreshed once in a while
      return
    }
    const resourceData = await this.getRepresentation(url)
    this.stores[url.toString()] = rdflib.graph()
    if (resourceData) {
      const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
      parse(resourceData.body, this.stores[url.toString()], url.toString(), resourceData.contentType)
    }
  }

  async patch (url: URL, sparqlQuery: string, appendOnly: boolean) {
    await this.load(url)
    debug('before patch', this.stores[url.toString()].toNT())

    const sparqlUpdateParser = rdflib.sparqlUpdateParser as unknown as (patch: string, store: any, url: string) => any
    const patchObject = sparqlUpdateParser(sparqlQuery, rdflib.graph(), url.toString())
    debug('patchObject', patchObject)
    if (appendOnly && typeof patchObject.delete !== 'undefined') {
      debug('appendOnly and patch contains deletes')
      throw new ErrorResult(ResultType.AccessDenied)
    }
    await new Promise((resolve, reject) => {
      this.stores[url.toString()].applyPatch(patchObject, this.stores[url.toString()].sym(url), (err: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    debug('after patch', this.stores[url.toString()].toNT())
    return rdflib.serialize(undefined, this.stores[url.toString()], url, 'text/turtle')
  }
  flushCache (url: URL) {
    delete this.stores[url.toString()]
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
