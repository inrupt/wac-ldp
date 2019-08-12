import * as events from 'events'
import Debug from 'debug'
import { Node } from './Node'
import { Container, Member } from './Container'
import { Blob } from './Blob'
import { BlobTree, Path } from './BlobTree'
import { bufferToStream, streamToBuffer } from '../rdf/ResourceDataUtils'
import { promises as fsPromises, Dirent } from 'fs'
import { join as pathJoin } from 'path'

const debug = Debug('AtomicTreeInMem')

class NodeNssCompat {
  path: Path
  tree: BlobTreeNssCompat
  filePath: string
  constructor (path: Path, tree: BlobTreeNssCompat) {
    this.path = path
    this.tree = tree
    const relativePath = pathJoin.apply(undefined, this.path.segments)
    this.filePath = pathJoin(this.tree.dataDir, relativePath)
  }
}

class ContainerNssCompat extends NodeNssCompat implements Container {
  async getMembers () {
    const dirents = await fsPromises.readdir(this.filePath, { withFileTypes: true })
    return dirents.map((dirent: Dirent) => {
      return {
        name: dirent.name,
        isContainer: dirent.isDirectory() }
    })
  }
  delete (): Promise<void> {
    return fsPromises.rmdir(this.filePath)
  }
  exists (): Promise<boolean> {
    return fsPromises.access(this.filePath)
      .then(() => true)
      .catch(() => false)
  }
}

class BlobNssCompat extends NodeNssCompat implements Blob {
  async getData (): Promise<ReadableStream | undefined> {
    // FIXME: get this to work with fs.createReadStream
    // which returns a https://nodejs.org/dist/latest-v10.x/docs/api/stream.html#stream_class_stream_readable
    // instead of ReadableStream, and it seems the two are different?

    const buffer = await fsPromises.readFile(this.filePath)
    return bufferToStream(buffer)
  }
  async setData (data: ReadableStream) {
    const relativeContainerPath = pathJoin.apply(undefined, this.path.toParent().segments)
    const containerPath = pathJoin(this.tree.dataDir, relativeContainerPath)
    await fsPromises.mkdir(containerPath, { recursive: true })
    return fsPromises.writeFile(this.filePath, await streamToBuffer(data))
  }
  delete (): Promise<void> {
    return fsPromises.unlink(this.filePath)
  }
  exists (): Promise<boolean> {
    return fsPromises.access(this.filePath)
      .then(() => true)
      .catch(() => false)
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
