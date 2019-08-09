# wac-ldp

[![Build Status](https://travis-ci.org/inrupt/wac-ldp.svg?branch=master)](https://travis-ci.org/inrupt/wac-ldp) [![Coverage Status](https://coveralls.io/repos/github/inrupt/wac-ldp/badge.svg?branch=master)](https://coveralls.io/github/inrupt/wac-ldp?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/inrupt/wac-ldp.svg)](https://greenkeeper.io/)

A central component for Solid servers, handles Web Access Control and Linked Data Platform concerns.

# Design

## Storage backends
This module is designed to be very pluggable. There are three ways to plug in the storage backend:

### Tree-aware key-value store
This is the standard way. It's almost the same as plugging in a normal dumb key-value store, but
instead of a string, each key is an array of strings, like a file path. That way, wac-ldp can efficiently
take advantage of existing tree-structure capabilities of for instance a file system. If you implement
this backend on top of something that doesn't support tree structures, then you have to update the container
listings on each write (make sure this is done atomically). In this configuration, a triple store is still needed for RDF-aware operations and functionality, but LDP-RS will only be passed through it if needed.

### Triple store as a write-through cache only
This still requires you to provide a tree-aware key-value store, but wac-ldp will pass all LDP-RS requests through the StoreManager, so that an existing triple store (that may then also expose other query interfaces) will be guaranteed to see all LDP-RS data, but will not be responsible for persisting it. The triple store is treated as a cache, and will be trusted as the source of truth if it says it has a certain resource loaded, but if not, the resource will be loaded into it from the tree-aware key-value store first.
 
### Persisting triple store
In this setup, only LDP-NR resources will go to the tree-aware key-value store, and for LDP-RS resources, the triple store will be trusted as the source of truth. The tree-aware key-value store will then only hold a placeholder object, so that it can still be correctly queried for LDP-BC listings, but it will not store any data from LDP-RS.

### Choice not to support LDP-BC in triple store
Given the limited amount of cross-document RDF manipulation required by the roughly-0.8 Solid spec, we expect most people to use wac-ldp with filesystem or no-sql database backends, and not with persisting triple stores. Particularly, the spec does not require any triple-aware reasoning about multiple LDP-BCs, just listing the `ldp:contains` triples from one, at most doing some paging on that. Since we want to take advantage of the tree-aware functionalities of backends like file systems, we chose to always rely on the tree-aware key-value store, and not the triple store, for producing LDP-BC representations. One important example of a reason why that may have downsides would be if we want to implement paging, for containers that have, say, more than 1000 contained items.

For that, we would have to put a pager in front of the tree-aware key-value store, that reads *and caches* the stream, so that it can be reused across subsequent requests, and the stream doesn't have to be loaded from scratch if you want to e.g. read items 17,001..18,000. There are currently no plans for adding such a pager, but if the next spec version requires paging support, then we can easily add it. Another option for this would have been to store all `ldp:contains` triples in the triple store from the start, but the disadvantage of that would be that we would duplicate the tree-awareness functionality of backends like the filesystem, and that felt a bit like overkill.

### Interfaces
Whether translating, caching or persisting, the triple store exposes the `StoreManager` interface which supports pretty much the same functionality as an rdf.js `DataSet`, except that `graph` is not optional in queries (i.e. you can't query across multiple LDP-RSs), plus serializers and parsers for at least text/turtle and application/ld+json. It also requires support for sparql-update, to make it simpler to implement the PATCH verb from the roughly-0.8 spec (see below).

## AclManager and sparl-update functionality

The ACL manager implements the 'wac' in 'wac-ldp'. It has direct query access to the quads in the triple store, so that it doesn't need to be aware of any RDF serializations or indexing. This is a nice separation of concerns that other Solid pod server architectures like https://github.com/solid/node-solid-server and https://github.com/rubenverborgh/solid-server-architecture lack (the latter does support accesssing a quad stream, but even there, there is no way to query those quads in the way you would query an rdf.js `DataSet`, so then the AclManager basically needs to implement a second in-memory triple store, which is not so nice in terms of code architecture, and probably also error-prone).

Likewise, as noted earlier, the StoreManager (which is the queriable interface of the triple store) also implements sparql-update operations. This means that the operation handler for PATCH does not need to know anything about the representation of the update - apart from the fact that the triple store will try to apply it to its authoritative copy of the LDP-RS's triples. We considered representing a Patch object as a Representation (not a representation of the resource, but of a change that's being made to that resource), but then the http parser and/or the PATCH operation would need to get involve in parsing the sparql-update query string. It's much cleaner to pass the query around as an unparsed string, and leave its interpretation to the last minute, in the context where it makes sense and where it is being applied.

## Operation handlers

We have an array of operation handlers, roughly one per HTTP verb or per function that a Solid pod server exposes. Each handler is asked if it can handle a given request, and the first one to say yes gets to respond to it. This is very similar to basic middleware architecture(koa, express) which is common in NodeJS applications. The operation handler also needs to expose which access modes it requires, so that the authorization module can check whether the credentials (parsed and verified by the authentication module) give enough granted permissions to let the request be executed.
 
## WacLdpTask and WacLdpResponse

All awareness of the HTTP protocol is kept inside src/lib/api/http/HttpParser and src/lib/api/http/HttpResponder. This is sometimes quite subtle because we're so used to thinking in terms of a http-level 'PATCH request' instead of an API format agnostic 'update request', and of thinking of a 'not found' error as 'a 404', but separating the HTTP protocol from the operation handlers and the rest of the code gives a nice separation between representation and meaning of a server request. The WacLdpTask is the http-agnostic counterpart of a http request, and the WacLdpResponse is the http-agnostic counterpart of a http response.

## Interface definitions

### 1. WacLdp
```ts
export interface WacLdp extends EventEmitter {
  handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void>
}
```
### 2. AclManager
```ts
export interface AclManager {
  setRootAcl (storageRoot: URL, owner: URL): Promise<void>
  setPublicAcl (containerUrl: URL, owner: URL, modeName: string): Promise<void>
  getTrustedAppModes (webId: URL, origin: string): Promise<Array<URL>>
  setTrustedAppModes (webId: URL, origin: string, modes: Array<URL>): Promise<void>
  hasAccess (webId: URL, origin: string, url: URL, mode: URL): Promise<boolean>
}
```
### 3. StoreManager
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
### 4. BufferTree
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
  getChildren (): Promise<ReadableStream<Child>> // works for InternalContainerNode and EmptyContainerNode
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
