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
import { Container, Member } from '../storage/Container'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'

const debug = Debug('StoreManager')

export function getEmptyGraph () {
  return rdf.dataset()
}

export interface RdfNode {
  value: string
}

export function stringToRdfNode (str: string): RdfNode {
  return rdflib.sym(str)
}

export function urlToRdfNode (url: URL): RdfNode {
  return stringToRdfNode(url.toString())
}

export function rdfNodeToString (rdfNode: RdfNode): string {
  return rdfNode.value
}

export function rdfNodeToUrl (rdfNode: RdfNode): URL {
  return new URL(rdfNodeToString(rdfNode))
}

export interface Pattern {
  subject?: RdfNode
  predicate?: RdfNode
  object?: RdfNode
  why: RdfNode
}

export interface Quad {
  subject: RdfNode
  predicate: RdfNode
  object: RdfNode
  why: RdfNode
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

function requiresTranslation (metaData: any, options: any) {
  return false
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
  deleteResource (url: URL): Promise<void> {
    const blob = this.storage.getBlob(url)
    return blob.delete()
  }
  getMembers (url: URL): Promise<Array<Member>> {
    const container = this.storage.getContainer(url)
    return container.getMembers()
  }
  containerExists (url: URL): Promise<boolean> {
    const container = this.storage.getContainer(url)
    return container.exists()
  }
  async statementsMatching (pattern: Pattern) {
    debug('statementsMatching', pattern)
    await this.load(rdfNodeToUrl(pattern.why))
    debug(this.stores[rdfNodeToString(pattern.why)])
    const ret = this.stores[rdfNodeToString(pattern.why)].statementsMatching(
      pattern.subject,
      pattern.predicate,
      pattern.object,
      pattern.why)
    debug(ret)
    return ret
  }
  getRepresentationFromStore (url: URL): ResourceData {
    const body = rdflib.serialize(undefined, this.stores[url.toString()], url, 'text/turtle')
    // const body = this.stores[url.toString()].toNT()
    return makeResourceData('text/turtle', body)
  }

  async getRepresentationFromRemote (url: URL): Promise<ResourceData> {
    debug('calling node-fetch', url.toString())
    const response: any = await fetch(url.toString())
    const contentType = response.headers.get('content-type')
    const etag = response.headers.get('etag')
    const rdfType = determineRdfType(contentType)
    const body = (await streamToBuffer(response as unknown as ReadableStream)).toString()
    return { contentType, body, etag, rdfType }
  }
  // cases:
  // 1. from cache
  // 2. remote
  // 3. container
  // 4. translate
  // 5. stream
  async getRepresentation (url: URL, options?: any): Promise<ResourceData | undefined> {
    // if cache miss, fetch metadata
    // if container, serialize quads without caching (we currently don't cache local containers)
    // if non-container LDP-RS, and requires translation, load and serialize
    // otherwise stream body

    // 1. check the cache
    if (this.stores[url.toString()]) {
      return this.getRepresentationFromStore(url)
    }

    // 2. check remote
    debug('getResourceData - local?', url.host, this.serverRootDomain)
    if (!url.host.endsWith(this.serverRootDomain)) {
      return this.getRepresentationFromRemote(url)
    }
    // 3. container
    const metaData = await this.storage.getMetaData(url)
    if (metaData.isContainer) {
      const quadStream = this.storage.getQuadStream(url, (options && options.preferMinimalContainer))
      const data = rdflib.serialize(undefined, rdflib.graph(), url, 'text/turtle')
      return makeResourceData('text/turtle', data)
    }

    // 4. translate
    if (requiresTranslation(metaData, options)) {
      await this.load(url)
      return this.getRepresentationFromStore(url)
    }

    // 5. stream
    return makeResourceData(metaData.contentType, (await streamToBuffer(metaData.body)).toString())
  }
  setRepresentation (url: URL, stream: ReadableStream) {
    const blob: Blob = this.storage.getBlob(url)
    return blob.setData(stream)
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
  save (url: URL) {
    const resourceData = this.getRepresentationFromStore(url)
    return this.storage.getBlob(url).setData(objectToStream(resourceData))
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
  }
  flushCache (url: URL) {
    delete this.stores[url.toString()]
  }
}
