import { RdfLayer } from './RdfLayer'
import { Blob } from '../storage/Blob'
import { BlobTree } from '../storage/BlobTree'
import * as rdflib from 'rdflib'
import Debug from 'debug'
import { ResourceData, streamToObject } from './ResourceDataUtils'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('Caching RDF Layer')

export class CachingRdfLayer extends RdfLayer {
  // FIXME: use one type of in-memory RDF store,
  // currently we use rdf-ext for GET, rdflib.js for PATCH, and Communica for SPARQL-GET
  graphs: { [url: string]: any }
  stores: { [url: string]: any }
  blobs: { [url: string]: Blob }
  constructor (serverHost: string, storage: BlobTree) {
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
}
