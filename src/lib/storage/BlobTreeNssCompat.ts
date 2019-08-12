import * as events from 'events'
import Debug from 'debug'
import { Node } from './Node'
import { Container, Member } from './Container'
import { Blob } from './Blob'
import { BlobTree, Path } from './BlobTree'
import { bufferToStream, streamToBuffer } from '../rdf/ResourceDataUtils'

const debug = Debug('AtomicTreeInMem')

class NodeNssCompat {
  path: Path
  tree: BlobTreeNssCompat

  constructor (path: Path, tree: BlobTreeNssCompat) {
    this.path = path
    this.tree = tree
  }
}

class ContainerNssCompat extends NodeNssCompat implements Container {
  getMembers () {
    const members: Array<Member> = []
    return Promise.resolve(members)
  }
  delete (): Promise<void> {
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    return Promise.resolve(false)
  }
}

class BlobNssCompat extends NodeNssCompat implements Blob {
  getData (): Promise<ReadableStream | undefined> {
    return Promise.resolve(undefined)
  }
  async setData (data: ReadableStream) {
    return Promise.resolve()
  }
  delete (): Promise<void> {
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    return Promise.resolve(false)
  }
}

export class BlobTreeNssCompat extends events.EventEmitter {
  dataDir: string

  constructor (dataDir: string) {
    super()
    this.dataDir = dataDir
  }
  getContainer (path: Path) {
    return new ContainerNssCompat(path, this)
  }
  getBlob (path: Path) {
    return new BlobNssCompat(path, this)
  }
}
