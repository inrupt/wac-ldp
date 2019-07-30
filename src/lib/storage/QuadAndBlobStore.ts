import Debug from 'debug'
import { BlobTree, urlToPath, Path } from './BlobTree'
import { Member } from './Container'
import { membersListAsQuadStream } from './membersListAsResourceData'
import { quadStreamFromBlob } from '../rdf/StoreManager'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { RdfType, objectToStream, streamToObject, bufferToStream } from '../rdf/ResourceDataUtils'

const debug = Debug('quad-and-blob-store')

export interface MetaData {
  exists: boolean
  isContainer: boolean
  getMembers?: () => Promise<Array<Member>>
  contentType?: string // only non-containers have a contentType
  etag: string
  body?: ReadableStream
}

export class QuadAndBlobStore {
  storage: BlobTree
  constructor (storage: BlobTree) {
    this.storage = storage
  }
  delete (url: URL) {
    return this.storage.getBlob(urlToPath(url)).delete()
  }
  exists (url: URL) {
    return this.storage.getBlob(urlToPath(url)).exists()
  }
  setData (url: URL, data: ReadableStream): Promise<void> {
    const blob = this.storage.getBlob(urlToPath(url))
    return blob.setData(data)
  }
  getContainer (url: URL) {
    return this.storage.getContainer(urlToPath(url))
  }
  async getMetaData (url: URL): Promise<MetaData> {
    if (url.toString().substr(-1) === '/') {
      const container = this.storage.getContainer(urlToPath(url))
      return {
        exists: await container.exists(),
        isContainer: true,
        getMembers: container.getMembers.bind(container),
        etag: 'container'
      }
    } else {
      const blob = this.storage.getBlob(urlToPath(url))
      const resourceData = await streamToObject(await blob.getData())
      return {
        exists: await blob.exists(),
        isContainer: false,
        contentType: resourceData.contentType,
        etag: resourceData.etag,
        body: bufferToStream(resourceData.body)
      }

    }
  }
  async getQuadStream (url: URL, preferMinimalContainer?: boolean): Promise<any> {
    const path = urlToPath(url)
    if (path.isContainer) {
      const container = this.storage.getContainer(path)
      debug(container)
      let membersList: Array<Member>
      if (preferMinimalContainer) {
        membersList = []
      } else {
        membersList = await container.getMembers()
      }
      debug(membersList)
      return membersListAsQuadStream(url, membersList)
    } else {
      const blob = this.storage.getBlob(path)
      const stream = await quadStreamFromBlob(blob)
      return stream
    }
  }
  async setQuadStream (url: URL, quadStream: any): Promise<void> {
    const path = urlToPath(url)
    if (path.isContainer) {
      throw new Error('cannot set QuadStream on Container')
    } else {
      const blob = this.storage.getBlob(path)
      const resourceData = rdfToResourceData(quadStream, RdfType.Turtle)
      return blob.setData(objectToStream(resourceData))
    }
  }
}
