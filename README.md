# wac-ldp

[![Build Status](https://travis-ci.org/inrupt/wac-ldp.svg?branch=master)](https://travis-ci.org/inrupt/wac-ldp) [![Coverage Status](https://coveralls.io/repos/github/inrupt/wac-ldp/badge.svg?branch=master)](https://coveralls.io/github/inrupt/wac-ldp?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/inrupt/wac-ldp.svg)](https://greenkeeper.io/)

A central component for Solid servers, handles Web Access Control and Linked Data Platform concerns.

## 1. WacLdp
```ts
export interface WacLdp extends EventEmitter {
  handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void>
}
```
## 2. AclManager
```ts
export interface AclManager {
  setRootAcl (storageRoot: URL, owner: URL): Promise<void>
  setPublicAcl (containerUrl: URL, owner: URL, modeName: string): Promise<void>
  getTrustedAppModes (webId: URL, origin: string): Promise<Array<URL>>
  setTrustedAppModes (webId: URL, origin: string, modes: Array<URL>): Promise<void>
  hasAccess (webId: URL, origin: string, url: URL, mode: URL): Promise<boolean>
}
```
## 3. StoreManager
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
  getResourceData (): ResourceData
  setResourceData (newVersion: ResourceData): Promise<void> 
}
```
## 4. BufferTree
At each path there is either a `'content'` node (must be a leaf), a `'container'` node (may be internal or leaf), `'missing'` when the path extends the path of a container leaf (extending the path of a content node is illegal).

Errors that will be thrown:

| TreeNode method | container (internal) | container (leaf) | content | missing | illegal |
|-----------------|----------------------|------------------|---------|--------|----------|
| getChildren     |                      |                  | IsContentNode | IsMissingNode |
| getBodyStream   | IsContainerNode      | IsContainerNode  |         | IsMissingNode |
| getMetaData     | IsContainerNode      | IsContainerNode  |         | IsMissingNode |
| replace         | NotEmpty             |                  |         |               |

```ts
export interface Child {
  name: string
  isContainer: boolean
}

export interface ResourceData {
  getBodyStream (): ReadableStream<Buffer>
  getMetaData (): { [i: string]: Buffer } // special entry is 'contentType'
}

export enum NodeType {
  InternalContainerNode = 'internal-container-node',
  EmptyContainerNode = 'empty-container-node',
  ContentNode = 'content-node',
  MissingNode = 'missing-node',
}

export interface TreeNode {
  nodeType: NodeType
  version: string // determined by implementation, read-only
  getChildren (): Promise<Array<Child>> // works for InternalContainerNode and EmptyContainerNode
  getResourceData (): ResourceData // works for ContentNode
  setResourceData (newVersion: ResourceData): Promise<void> // fails for InternalContainerNode and if the node already changed or became illegal
}
export interface BufferTree {
  getNode (path: Array<string>): Promise<TreeNode> // fails for illegal nodes. Sets a watch on the path to track if it changes
}
```

Published under an MIT license by inrupt, Inc.

Contributors:
* Michiel de Jong
* Jackson Morgan
* Ruben Verborgh
* Aaron Coburn
* Kjetil Kjernsmo
* Pat McBennett
* Justin Bingham
* Sebastien Dubois
* elf Pavlik
