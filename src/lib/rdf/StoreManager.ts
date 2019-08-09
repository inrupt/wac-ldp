import { ResourceData } from '../storage/BufferTree'

// import { ResourceData } from './ResourceDataUtils'

// TODO: think about if/how we want to add RdfJsTerm#equals from http://rdf.js.org/data-model-spec/#term-interface
export interface RdfJsTerm {
  termType: string
  value: string
  equals: (other: RdfJsTerm) => boolean
}

// TODO: maybe submit upstream PR to add Pattern to http://rdf.js.org
export interface Pattern {
  subject?: RdfJsTerm | Array<RdfJsTerm>
  predicate?: RdfJsTerm | Array<RdfJsTerm>
  object?: RdfJsTerm | Array<RdfJsTerm>
  graph: RdfJsTerm
}

// TODO: think about if/how we want to add Quad#equals from http://rdf.js.org/data-model-spec/#quad-interface
export interface Quad {
  subject: RdfJsTerm
  predicate: RdfJsTerm
  object: RdfJsTerm
  graph: RdfJsTerm
}

export interface StoreManager {
  addQuad (quad: Quad): Promise<void> // note: this method is called 'add' in rdf.js
  deleteMatches (pattern: Pattern): Promise<void> // note: rdf.js uses separate s,p,o,g here instead of our Pattern
  match (pattern: Pattern): Promise<Array<Quad>>
  subjectsMatching (pattern: Pattern): Promise<Array<RdfJsTerm>>
  predicatesMatching (pattern: Pattern): Promise<Array<RdfJsTerm>>
  objectsMatching (pattern: Pattern): Promise<Array<RdfJsTerm>>

  // cases:
  // 1. from cache
  // 2. remote
  // 3. container
  // 4. translate
  // 5. stream
  getResourceData (url: URL, options?: any): Promise<ResourceData>
  setResourceData (url: URL, resourceData: ResourceData): Promise<void>
  load (url: URL): Promise<void>
  save (url: URL): Promise<void>
  patch (url: URL, sparqlQuery: string, appendOnly: boolean): Promise<void>
  flushCache (url: URL): void
}
