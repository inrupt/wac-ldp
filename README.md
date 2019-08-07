# wac-ldp

[![Build Status](https://travis-ci.org/inrupt/wac-ldp.svg?branch=master)](https://travis-ci.org/inrupt/wac-ldp) [![Coverage Status](https://coveralls.io/repos/github/inrupt/wac-ldp/badge.svg?branch=master)](https://coveralls.io/github/inrupt/wac-ldp?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/inrupt/wac-ldp.svg)](https://greenkeeper.io/)

A central component for Solid servers, handles Web Access Control and Linked Data Platform concerns.

## 1. BufferTree
At each path there is either a container, a non-container, or nothing; errors that will be thrown:

| method | container | non-container | nothing |
|---------|-----------|---------------|--------|
| getMembers |  | NotContainer | NotFound |
| getResource | IsContainer |  | NotFound |

If there's a container, you can call getMembers
If there's a non-container, you can call getResource
```ts
export interface Member {
  name: string
  isContainer: boolean
}

export interface Resource {
  getBodyStream (): ReadableStream<Buffer>
  getMetaData (): { [i: string]: Buffer }
  replace (newVersion: Resource): Promise<void>
}

export interface BufferTree {
  getMembers (path: Array<string>): Promise<Array<Member>> throws NotContainer, NotFound
  getResource (path: Array<string>): Promise<Resource> throws IsContainer, NotFound
}
```
## 2. StoreManager
```ts
export interface RdfJsTerm {
  termType: string
  value: string
  equals: (other: RdfJsTerm) => boolean
}
export interface Pattern {
  subject?: RdfJsTerm | Array<RdfJsTerm>
  predicate?: RdfJsTerm | Array<RdfJsTerm>
  object?: RdfJsTerm | Array<RdfJsTerm>
  graph: RdfJsTerm
}
export interface Quad {
  subject: RdfJsTerm
  predicate: RdfJsTerm
  object: RdfJsTerm
  graph: RdfJsTerm
}
export interface DataSet { // see also https://rdf.js.org/dataset-spec/
  add (quad: Quad): void
  delete (quad: Quad): void
  match (pattern: Pattern): Array<Quad>
  has (pattern: Pattern): boolean
  deleteMatches (pattern: Pattern): void
  subjectsMatching (pattern: Pattern): Promise<Array<RdfJsTerm>>
  predicatesMatching (pattern: Pattern): Promise<Array<RdfJsTerm>>
  objectsMatching (pattern: Pattern): Promise<Array<RdfJsTerm>>
  patch (sparqlUpdateQuery: string, appendOnly: boolean): void
}

export interface StoreManager {
  load (url: URL): Promise<void>
  save (url: URL): Promise<void>
  flush (url: URL): Promise<void>
  getDataSet (url: URL): Promise<DataSet>
}
```
## 3. WacLdp
```ts
export interface WacLdp extends EventEmitter {
  setRootAcl (storageRoot: URL, owner: URL): Promise<void>
  setPublicAcl (containerUrl: URL, owner: URL, modeName: string): Promise<void>
  createLocalDocument (url: URL, contentType: string, body: ReadableStream<Buffer>): Promise<void>
  containerExists (url: URL): Promise<boolean>
  handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void>
  getTrustedAppModes (webId: URL, origin: string): Promise<Array<URL>>
  setTrustedAppModes (webId: URL, origin: string, modes: Array<URL>): Promise<void>
  hasAccess (webId: URL, origin: string, url: URL, mode: URL): Promise<boolean>
}
```

Published under an MIT license by inrupt, Inc.

Contributors:
* Michiel de Jong
* Ruben Verborgh
* Aaron Coburn
* Kjetil Kjernsmo
* Jackson Morgan
* Pat McBennett
* Justin Bingham
* Sebastien Dubois
* elf Pavlik
