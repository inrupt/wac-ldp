import * as events from 'events'
import Debug from 'debug'
import { Node } from './Node'
import { Container, Member } from './Container'
import { Blob } from './Blob'
import { BlobTree, Path } from './BlobTree'
import { bufferToStream, streamToBuffer, streamToObject, ResourceData, objectToStream, RdfType } from '../rdf/ResourceDataUtils'
import { promises as fsPromises, Dirent } from 'fs'
import { join as pathJoin } from 'path'
import * as mime from 'mime-types'
import glob from 'glob'

const debug = Debug('AtomicTreeInMem')

// ResourceMapper compat, see
// https://github.com/solid/node-solid-server/blob/master/lib/resource-mapper.js
function filePathToContentType (filePath: string): string {
  return mime.lookup(filePath) || 'application/octet-stream'
}
function contentTypeMatches (filePath: string, contentType: string): boolean {
  return (filePathToContentType(filePath) === contentType)
}
function contentTypeToExtension (contentType: string): string {
  return mime.extension(contentType) || ''
}
function filePathForContentType (filePath: string, contentType: string) {
  if (contentTypeMatches(filePath, contentType)) {
    return filePath
  } else {
    return `${filePath}$.${contentTypeToExtension(contentType)}`
  }
}
function withoutDollar (fileName: string) {
  return fileName.split('$')[0]
}

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
        name: withoutDollar(dirent.name),
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

    const existsAs = await this.existsAs()
    if (!existsAs) {
      throw new Error('not found')
    }
    const buffer: Buffer = await fsPromises.readFile(existsAs)
    const resourceData: ResourceData = {
      body: buffer.toString(),
      contentType: filePathToContentType(existsAs),
      etag: 'fs.getMTimeMS(this.filePath',
      rdfType: RdfType.Unknown
    }
    return objectToStream(resourceData)
  }
  async setData (data: ReadableStream) {
    const relativeContainerPath = pathJoin.apply(undefined, this.path.toParent().segments)
    const containerPath = pathJoin(this.tree.dataDir, relativeContainerPath)
    await fsPromises.mkdir(containerPath, { recursive: true })
    const resourceData: ResourceData = await streamToObject(data)
    const filePath = filePathForContentType(this.filePath, resourceData.contentType)
    return fsPromises.writeFile(filePath, resourceData.body)
  }
  async delete (): Promise<void> {
    const existsAs = await this.existsAs()
    if (existsAs) {
      return fsPromises.unlink(existsAs)
    }
  }
  existsWithoutDollar (): Promise<boolean> {
    return fsPromises.access(this.filePath)
      .then(() => true)
      .catch(() => false)
  }
  async existsAs (): Promise<string | undefined> {
    const existsWithoutDollar = await this.existsWithoutDollar()
    if (existsWithoutDollar) {
      return this.filePath
    }
    return new Promise((resolve, reject) => {
      glob(`${this.filePath}\$.*`, (err: Error | null, matches: Array<string>) => {
        if (err) {
          reject(err)
        }
        if (matches.length === 0) {
          resolve(undefined)
        }
        resolve(matches[0])
      })
    })
  }
  async exists (): Promise<boolean> {
    const existsAs: string | undefined = await this.existsAs()
    return (typeof existsAs === 'string')
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
