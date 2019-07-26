import { StoreManager } from './StoreManager'
import { Blob } from '../storage/Blob'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'
import * as rdflib from 'rdflib'
import Debug from 'debug'
import { ResourceData, streamToObject } from './ResourceDataUtils'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('Caching RDF Layer')

export class CachingStoreManager extends StoreManager {
  // FIXME: use one type of in-memory RDF store,
  // currently we use rdf-ext for GET, rdflib.js for PATCH, and Communica for SPARQL-GET
  graphs: { [url: string]: any }
  stores: { [url: string]: any }
  blobs: { [url: string]: Blob }
  constructor (serverHost: string, storage: QuadAndBlobStore) {
    super(serverHost, storage)
    this.graphs = {}
    this.stores = {}
    this.blobs = {}
  }
  async fetchGraph (url: URL) {
    if (!this.graphs[url.toString()]) {
      this.graphs[url.toString()] = await super.fetchGraph(url)
    }
    return this.graphs[url.toString()]
  }

  async applyPatch (resourceData: ResourceData, sparqlQuery: string, fullUrl: URL, appendOnly: boolean) {
    if (!this.stores[fullUrl.toString()]) {
      this.stores[fullUrl.toString()] = rdflib.graph()
      const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
      parse(resourceData.body, this.stores[fullUrl.toString()], fullUrl.toString(), resourceData.contentType)
    }
    debug('before patch', this.stores[fullUrl.toString()].toNT())

    const sparqlUpdateParser = rdflib.sparqlUpdateParser as unknown as (patch: string, store: any, url: string) => any
    const patchObject = sparqlUpdateParser(sparqlQuery, rdflib.graph(), fullUrl.toString())
    debug('patchObject', patchObject)
    if (appendOnly && typeof patchObject.delete !== 'undefined') {
      debug('appendOnly and patch contains deletes')
      throw new ErrorResult(ResultType.AccessDenied)
    }
    await new Promise((resolve, reject) => {
      this.stores[fullUrl.toString()].applyPatch(patchObject, this.stores[fullUrl.toString()].sym(fullUrl), (err: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    debug('after patch', this.stores[fullUrl.toString()].toNT())
    return rdflib.serialize(undefined, this.stores[fullUrl.toString()], fullUrl, 'text/turtle')
  }
  flushCache (url: URL) {
    delete this.stores[url.toString()]
  }
}
