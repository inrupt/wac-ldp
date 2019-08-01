import fetch from 'node-fetch'
import Debug from 'debug'
import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'
import * as rdflib from 'rdflib'

import { Blob } from '../storage/Blob'
import { ResourceData, streamToObject, determineRdfType, RdfType, makeResourceData, objectToStream, streamToBuffer, ResourceDataLdpRsNonContainer, ResourceDataLdpNr, ResourceType, ResourceDataLdpBc, exists } from './ResourceDataUtils'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'
import { StoreManager, Quad, Pattern, RdfJsTerm } from './StoreManager'

const debug = Debug('StoreManager')

async function flattenPromises (promises: Array<Promise<Array<Quad>>>): Promise<Array<Quad>> {
  const nestedLists: Array<Array<Quad>> = await Promise.all(promises)
  let flatList: Array<Quad> = []
  nestedLists.map((list: Array<Quad>) => {
    flatList = flatList.concat(list)
  })
  return flatList
}
export function getEmptyGraph () {
  return rdf.dataset()
}
export function newBlankNode (): RdfJsTerm {
  return new rdflib.BlankNode()
}

export function stringToRdfJsTerm (str: string): RdfJsTerm {
  return rdflib.sym(str)
}

export function urlToRdfJsTerm (url: URL): RdfJsTerm {
  return stringToRdfJsTerm(url.toString())
}

export function rdfNodeToString (rdfTerm: RdfJsTerm): string {
  return rdfTerm.value
}

export function rdfNodeToUrl (rdfTerm: RdfJsTerm): URL {
  return new URL(rdfNodeToString(rdfTerm))
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

export async function quadStreamFromBlob (blob: Blob, rdfType: RdfType): Promise<ReadableStream<Quad>> {
  const stream = await blob.getData()
  debug('stream', typeof stream)
  let resourceData
  if (stream) {
    resourceData = await streamToObject(stream) as ResourceDataLdpRsNonContainer
  } else {
    return getEmptyGraph()
  }
  debug('got ACL ResourceData', resourceData)

  return resourceData.getQuads()
}

export async function getGraphLocal (blob: Blob): Promise<any> {
  const resourceData: ResourceData = await streamToObject(blob.getData())
  const quadStream = await quadStreamFromBlob(blob, determineRdfType(resourceData.contentType))
  return rdf.dataset().import(quadStream)
}

function requiresTranslation (metaData: any, options: any) {
  return false
}

export class RdfLibStoreManager implements StoreManager {
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
  delete (url: URL): Promise<void> {
    return this.storage.delete(url)
  }
  async exists (url: URL): Promise<boolean> {
    const resourceData = await this.storage.read(url)
    return exists(resourceData)
  }
  getResourceData (url: URL): Promise<ResourceData> {
    return this.storage.read(url)
  }
  async addQuad (quad: Quad) {
    const docUrl: URL = rdfNodeToUrl(quad.graph)
    await this.load(docUrl)
    return this.stores[docUrl.toString()].add(quad.subject, quad.predicate, quad.object, quad.graph)
  }
  async deleteMatches (pattern: Pattern) {
    const docUrl: URL = rdfNodeToUrl(pattern.graph)
    await this.load(docUrl)
    const statements = this.stores[docUrl.toString()].statementsMatching(pattern.subject, pattern.predicate, pattern.object, pattern.graph)
    this.stores[docUrl.toString()].removeStatements([...statements])
  }
  async match (pattern: Pattern): Promise<Array<Quad>> {
    if (pattern.subject && Array.isArray(pattern.subject)) {
      return flattenPromises(pattern.subject.map((subject: RdfJsTerm) => {
        return this.match({
          subject,
          predicate: pattern.predicate,
          object: pattern.object,
          graph: pattern.graph
        })
      }))
    }
    if (pattern.predicate && Array.isArray(pattern.predicate)) {
      return flattenPromises(pattern.predicate.map((predicate: RdfJsTerm) => {
        return this.match({
          subject: pattern.subject,
          predicate,
          object: pattern.object,
          graph: pattern.graph
        })
      }))
    }
    if (pattern.object && Array.isArray(pattern.object)) {
      return flattenPromises(pattern.object.map((object: RdfJsTerm) => {
        return this.match({
          subject: pattern.subject,
          predicate: pattern.object,
          object,
          graph: pattern.graph
        })
      }))
    }
    debug('statementsMatching', pattern)
    await this.load(rdfNodeToUrl(pattern.graph))
    debug(this.stores[rdfNodeToString(pattern.graph)])
    const ret = this.stores[rdfNodeToString(pattern.graph)].statementsMatching(
      pattern.subject,
      pattern.predicate,
      pattern.object,
      pattern.graph)
    debug(ret)
    return ret
  }
  async subjectsMatching (pattern: Pattern): Promise<Array<RdfJsTerm>> {
    const statements = await this.match(pattern)
    return statements.map((quad: Quad) => quad.subject)
  }
  async predicatesMatching (pattern: Pattern): Promise<Array<RdfJsTerm>> {
    const statements = await this.match(pattern)
    return statements.map((quad: Quad) => quad.predicate)
  }
  async objectsMatching (pattern: Pattern): Promise<Array<RdfJsTerm>> {
    const statements = await this.match(pattern)
    return statements.map((quad: Quad) => quad.object)
  }
  getRepresentationFromStore (url: URL): ResourceData {
    const body = rdflib.serialize(undefined, this.stores[url.toString()], url, 'text/turtle')
    // const body = this.stores[url.toString()].toNT()
    return makeResourceData('text/turtle', body)
  }

  async getRepresentationFromRemote (url: URL): Promise<ResourceDataLdpNr> {
    debug('calling node-fetch', url.toString())
    const response: any = await fetch(url.toString())
    const contentType = response.headers.get('content-type')
    const etag = response.headers.get('etag')
    const rdfType = determineRdfType(contentType)
    const body = (await streamToBuffer(response as unknown as ReadableStream)).toString()
    return {
      contentType,
      etag,
      getBody: () => response
    } as ResourceDataLdpNr
  }
  // cases:
  // 1. from cache
  // 2. remote
  // 3. container
  // 4. translate
  // 5. stream
  async getRepresentation (url: URL, options?: any): Promise<ResourceData> {
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
    const resourceData = await this.storage.read(url)
    if (resourceData.resourceType === ResourceType.LdpBc) {
      const quadStream = (resourceData as ResourceDataLdpBc).getQuads((options && options.preferMinimalContainer))
      const data = rdflib.serialize(undefined, rdflib.graph(), url, 'text/turtle')
      return makeResourceData('text/turtle', data)
    }

    // 4. translate
    if (requiresTranslation(resourceData, options)) {
      await this.load(url)
      return this.getRepresentationFromStore(url)
    }

    // 5. stream
    debug('streaming', resourceData)
    return makeResourceData(resourceData.contentType as string, (await streamToBuffer((resourceData as ResourceDataLdpNr).getBody())).toString())
  }
  setRepresentation (url: URL, resourceData: ResourceData) {
    return this.storage.write(url, resourceData)
  }
  async load (url: URL) {
    if (this.stores[url.toString()]) {
      // to do: check if cache needs to be refreshed once in a while
      return
    }
    if (url.host.endsWith(this.serverRootDomain)) {
      // const resourceData: ResourceDataLdpRsNonContainer = await this.getRepresentationFromStore(url)
    } else {
      const resourceData: ResourceDataLdpNr = await this.getRepresentationFromRemote(url)
      this.stores[url.toString()] = rdflib.graph()
      if (resourceData) {
        const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
        parse((await streamToBuffer(resourceData.getBody())).toString(), this.stores[url.toString()], url.toString(), resourceData.contentType)
      }
    }
  }
  save (url: URL) {
    const resourceData = this.getRepresentationFromStore(url)
    return this.storage.write(url, objectToStream(resourceData))
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
