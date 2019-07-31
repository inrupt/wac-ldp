import { ResourceData } from '../storage/QuadAndBlobStore'

// TODO: align RdfNode with http://rdf.js.org/data-model-spec/#term-interface
export interface RdfNode {
  value: string
}

// TODO: submit upstream PR to add Pattern to http://rdf.js.org
export interface Pattern {
  subject?: RdfNode | Array<RdfNode>
  predicate?: RdfNode | Array<RdfNode>
  object?: RdfNode | Array<RdfNode>
  why: RdfNode
}

// TODO: align Quad with http://rdf.js.org/data-model-spec/#quad-interface
export interface Quad {
  subject: RdfNode
  predicate: RdfNode
  object: RdfNode
  why: RdfNode
}

export interface StoreManager {
  delete (url: URL): Promise<void>
  exists (url: URL): Promise<boolean>
  getResourceData (url: URL): Promise<ResourceData>
  addQuad (quad: Quad): Promise<void>
  removeStatements (pattern: Pattern): Promise<void>
  statementsMatching (pattern: Pattern): Promise<Array<Quad>>
  subjectsMatching (pattern: Pattern): Promise<Array<RdfNode>>
  predicatesMatching (pattern: Pattern): Promise<Array<RdfNode>>
  objectsMatching (pattern: Pattern): Promise<Array<RdfNode>>

  // cases:
  // 1. from cache
  // 2. remote
  // 3. container
  // 4. translate
  // 5. stream
  getRepresentation (url: URL, options?: any): Promise<ResourceData>
  setRepresentation (url: URL, metaData: ResourceData): Promise<void>
  load (url: URL): Promise<void>
  save (url: URL): Promise<void>
  patch (url: URL, sparqlQuery: string, appendOnly: boolean): Promise<void>
  flushCache (url: URL): void
}