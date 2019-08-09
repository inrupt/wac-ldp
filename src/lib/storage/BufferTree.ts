import * as events from 'events'
import Debug from 'debug'

const debug = Debug('BlobTree')

const STORAGE_FORMAT = 'v2'

// The BlobTree is a tree structure. Its internal Nodes are called Containers. Its leaves are called Blobs.
// A Blob has methods setData and getData, which take and return a ReadableStream, so that you can store opaque
// data in them.
// A Container doesn't have much functionality except that you can query a list of its Members (its children in the tree).
//
// A path is defined by a list of path segments, which are strings.
// To allow for convenient slash-separated concatenation of path segments, they are not allowed to contain the '/' character.
// The Path of a Node is the list of names of nodes you have to visit to get to it.
// A Path always starts with 'root', and ends with the Node's own name; for instance: ['root', 'foo', 'bar']
// Sibling Nodes are not allowed to have the same name.

function copyStringArray (arr: Array<string>): Array<string> {
  return JSON.parse(JSON.stringify(arr))
}

export function urlToPath (url: URL) {
  let urlPath = url.pathname
  let isContainer = false

  if (urlPath.substr(-1) === '/') {
    isContainer = true
    urlPath = urlPath.substring(0, urlPath.length - 1)
  }
  debug('determined containerhood', url.pathname, isContainer, urlPath)
  const segments = urlPath.split('/')
  segments[0] = url.host
  segments.unshift(STORAGE_FORMAT)
  return segments
}

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
  MissingNode = 'missing-node'
}

export interface TreeNode {
  nodeType: NodeType
  version: string // determined by implementation, read-only
  getChildren (): Promise<Array<Child>> // works for InternalContainerNode and EmptyContainerNode
  getResourceData (): ResourceData // works for ContentNode
  replace (newVersion: ResourceData): Promise<void> // fails for InternalContainerNode and if the node already changed or became illegal
}
export interface BufferTree {
  getNode (path: Array<string>): Promise<TreeNode> // fails for illegal nodes. Sets a watch on the path to track if it changes
}
