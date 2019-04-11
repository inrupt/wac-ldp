import Debug from 'debug'
import { Node } from './Node'
import { Container } from './Container'
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
  exists () {
    throw new Error('overwrite me')
  }
}

const PLACEHOLDER_MEMBER_NAME = '.placeholder'

class ContainerInMem extends NodeInMem implements Container {
  getDescendents () {
    const containerPathPrefix = this.path.asString() + '/'
    return Object.keys(this.tree.kv).filter(x => {
      return (x.length > containerPathPrefix.length)
    }).filter(x => {
      return (x.substr(0, containerPathPrefix.length) === containerPathPrefix
      )
    })
  }
  getMembers () {
    const listAbsolutePaths = this.getDescendents()
    const prefixLength = this.path.asString().length + 1
    const listRelativePaths = listAbsolutePaths.map(x => x.substring(prefixLength))
    const distinct = (value, index, self) => {
      return self.indexOf(value) === index
    }
    const memberNames = listRelativePaths.map(x => {
      const parts = x.split('/')
      if (parts.length === 1) { // member blob
        return x
      } else {
        return parts[0] + '/'
      }
    }).filter(distinct).filter(x => (x !== PLACEHOLDER_MEMBER_NAME))
    debug('getMembers', this.path, this.tree.kv, listAbsolutePaths, listRelativePaths, memberNames)
    return Promise.resolve(memberNames)
  }
  delete () {
    this.getDescendents().map(x => {
      delete this.tree.kv[x]
    })
    return Promise.resolve()
  }
  exists () {
    debug('checking exists', this.path.asString(), Object.keys(this.tree.kv))
    return (!!this.getDescendents().length)
  }
}

class BlobInMem extends NodeInMem implements Blob {
  getData () {
    debug('reading resource', this.path, this.tree.kv)
    return Promise.resolve(this.tree.kv[this.path.asString()])
  }
  setData (data: Buffer) {
    debug('setData', this.path)
    this.tree.kv[this.path.asString()] = data
    debug('this.tree.kv after setData', this.tree.kv, this.path, this.path.asString())
    return Promise.resolve()
  }
  delete () {
    delete this.tree.kv[this.path.asString()]
    return Promise.resolve()
  }
  exists () {
    debug('checking exists', this.path.asString(), Object.keys(this.tree.kv))
    return (!!this.tree.kv.hasOwnProperty(this.path.asString()))
  }
}

export default class BlobTreeInMem {
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
    debug('adding event handler', eventName, eventHandler)
  }
}
