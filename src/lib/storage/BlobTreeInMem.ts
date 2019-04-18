import Debug from 'debug'
import { Node } from './Node'
import { Container, Member } from './Container'
import { Blob } from './Blob'
import { BlobTree, Path } from './BlobTree'

const debug = Debug('AtomicTreeInMem')

class NodeInMem {
  path: Path
  tree: BlobTreeInMem

  constructor (path: Path, tree: BlobTreeInMem) {
    this.path = path
    this.tree = tree
    debug('constructed node', path, tree)
  }
}

class ContainerInMem extends NodeInMem implements Container {
  getDescendents () {
    const containerPathPrefix = this.path.toContainerPathPrefix()
    return Object.keys(this.tree.kv).filter(x => (
      (x.length > containerPathPrefix.length) && // x is longer than container/path/prefix/
      (x.substr(0, containerPathPrefix.length) === containerPathPrefix) // x srtarts with container/path/prefix/
    ))
  }
  getMembers () {
    const listAbsolutePaths = this.getDescendents()
    const prefixLength = this.path.toString().length + 1
    const listRelativePaths = listAbsolutePaths.map(x => x.substring(prefixLength))
    const memberMap = {}
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
    debug('getMembers', this.path, this.tree.kv, listAbsolutePaths, listRelativePaths, memberMap, members)
    return Promise.resolve(members)
  }
  delete (): Promise<void> {
    this.getDescendents().map(x => {
      delete this.tree.kv[x]
    })
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    debug('checking exists', this.path.toString(), Object.keys(this.tree.kv))
    return Promise.resolve(!!this.getDescendents().length)
  }
}

class BlobInMem extends NodeInMem implements Blob {
  getData () {
    debug('reading resource', this.path, this.tree.kv)
    return Promise.resolve(this.tree.kv[this.path.toString()])
  }
  setData (data: ReadableStream) {
    debug('setData', this.path)
    this.tree.kv[this.path.toString()] = data
    debug('this.tree.kv after setData', this.tree.kv, this.path, this.path.toString())
    return Promise.resolve()
  }
  delete (): Promise<void> {
    delete this.tree.kv[this.path.toString()]
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    debug('checking exists', this.path.toString(), Object.keys(this.tree.kv))
    return Promise.resolve((!!this.tree.kv.hasOwnProperty(this.path.toString())))
  }
}

export class BlobTreeInMem {
  kv: any

  constructor () {
    this.kv = {}
    debug('constructed in-mem store', this.kv)
  }

  getContainer (path: Path) {
    return new ContainerInMem(path, this)
  }
  getBlob (path: Path) {
    return new BlobInMem(path, this)
  }
  on (eventName: string, eventHandler: (event: any) => void) {
    // TODO: implement
    // debug('adding event handler', eventName, eventHandler)
  }
}
