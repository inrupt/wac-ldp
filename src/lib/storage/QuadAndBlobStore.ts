import Debug from 'debug'
import { BlobTree, urlToPath, Path } from './BlobTree'
import { Member } from './Container'
import { membersListAsQuadStream } from './membersListAsResourceData'
import { quadStreamFromBlob } from '../rdf/StoreManager'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { RdfType, objectToStream } from '../rdf/ResourceDataUtils'

const debug = Debug('quad-and-blob-store')

export class QuadAndBlobStore {
  storage: BlobTree
  constructor (storage: BlobTree) {
    this.storage = storage
  }
  getBlob (url: URL) {
    return this.storage.getBlob(urlToPath(url))
  }
  getBlobAtPath (path: Path) {
    return this.storage.getBlob(path)
  }
  getContainer (url: URL) {
    return this.storage.getContainer(urlToPath(url))
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