import * as events from 'events'
import Debug from 'debug'
import { ResourceNode } from './ResourceNode'
import { BufferTree, Path, Member } from './BufferTree'
import { bufferToStream, streamToBuffer } from '../rdf/ResourceDataUtils'
import { containerMemberAddHandler } from '../operationHandlers/containerMemberAddHandler'

const debug = Debug('AtomicTreeInMem')

const SUFFIX_BODY = ':body'
const SUFFIX_META = ':meta'

class NodeInMem {
  path: Path
  tree: BufferTreeInMem

  constructor (path: Path, tree: BufferTreeInMem) {
    this.path = path
    this.tree = tree
    debug('constructed node', path, Object.keys(tree.kv))
  }
}

class ContainerInMem extends NodeInMem {
  getDescendents () {
    const containerPathPrefix = this.path.toString()
    debug('getDescendents', containerPathPrefix)
    return Object.keys(this.tree.kv).filter(x => (
      (x.length > containerPathPrefix.length) && // x is longer than container/path/prefix/
      (x.substr(0, containerPathPrefix.length) === containerPathPrefix) // x srtarts with container/path/prefix/
    ))
  }
  getMembers () {
    const listAbsolutePaths = this.getDescendents()
    const prefixLength = this.path.toString().length
    const listRelativePaths = listAbsolutePaths.map(x => x.substring(prefixLength))
    const memberMap: { [memberName: string]: boolean } = {}
    listRelativePaths.map(x => {
      const parts = x.split('/')
      if (parts.length === 1) { // member blob
        memberMap[x] = false
      } else { // sub container
        memberMap[parts[0]] = true
      }
    })
    const members = Object.keys(memberMap).map(name => {
      return {
        name,
        isContainer: memberMap[name]
      } as Member
    })
    debug('getMembers', this.path, Object.keys(this.tree.kv), listAbsolutePaths, listRelativePaths, memberMap, members)
    return Promise.resolve(members)
  }
  delete (): Promise<void> {
    this.getDescendents().map(x => {
      this.tree.emit('change', { path: x })
      delete this.tree.kv[x]
    })
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    debug('checking exists', this.path.toString(), Object.keys(this.tree.kv))
    return Promise.resolve(!!this.getDescendents().length)
  }
}

class BlobInMem extends NodeInMem implements ResourceNode {
  getData (): Promise<Array<Buffer>> {
    debug('reading resource', this.path, this.tree.kv)
    const buffer: Buffer | undefined = this.tree.kv[this.path.toString() + SUFFIX_META]
    if (buffer) {
      return Promise.resolve(bufferToStream(buffer))
    }
    throw new Error('blob does not exist')
  }
  getBodyVersion (etag: string): Promise<ReadableStream> {
    debug('reading resource', this.path, this.tree.kv)
    const buffer: Buffer | undefined = this.tree.kv[this.path.toString() + SUFFIX_BODY]
    if (buffer) {
      return Promise.resolve(bufferToStream(buffer))
    }
    throw new Error('blob does not exist')
  }
  async setBodyVersion (etag: string, body: ReadableStream<Buffer>): Promise<void> {
    debug('setBodyVersion', this.path)
    this.tree.kv[this.path.toString() + SUFFIX_BODY + etag] = await streamToBuffer(body)
    debug('Object.keys(this.tree.kv) after setData', Object.keys(this.tree.kv), this.path, this.path.toString())
    return Promise.resolve()
  }
  async deleteBodyVersion (etag: string): Promise<void> {
    debug('deleteBodyVersion', this.path, etag)
    delete this.tree.kv[this.path.toString() + SUFFIX_BODY + etag]
    return Promise.resolve()
  }
  async setData (data: Array<Buffer>): Promise<void> {
    debug('setData', this.path)
    for (let i = 0; i < data.length; i++) {
      this.tree.kv[this.path.toString() + SUFFIX_META + i] = data[i]
    }
    debug('Object.keys(this.tree.kv) after setData', Object.keys(this.tree.kv), this.path, this.path.toString())
    this.tree.emit('change', { path: this.path })
    return Promise.resolve()
  }
  delete (): Promise<void> {
    delete this.tree.kv[this.path.toString()]
    this.tree.emit('change', { path: this.path })
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    debug('checking exists', this.path.toString(), Object.keys(this.tree.kv))
    return Promise.resolve((!!this.tree.kv.hasOwnProperty(this.path.toString())))
  }
}

export class BufferTreeInMem extends events.EventEmitter implements BufferTree {
  kv: { [pathStr: string]: Buffer | undefined }
  constructor () {
    super()
    this.kv = {}
    debug('constructed in-mem store', this.kv)
  }

  getMembers (path: Path) {
    const container = new ContainerInMem(path, this)
    return container.getMembers()
  }
  getResourceNode (path: Path) {
    return new BlobInMem(path, this)
  }
}
