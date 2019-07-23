import Debug from 'debug'
import { BlobTree, Path, urlToPath } from './BlobTree'
import { Member } from './Container'
import { membersListAsQuadStream } from '../rdf/membersListAsResourceData'
import { quadStreamFromBlob } from '../rdf/RdfLayer'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { RdfType, objectToStream } from '../rdf/ResourceDataUtils'

const debug = Debug('quad-and-blob-store')

export class QuadAndBlobStore {
  storage: BlobTree
  constructor (storage: BlobTree) {
    this.storage = storage
  }
  getBlob (path: Path) {
    return this.storage.getBlob(path)
  }
  getContainer (path: Path) {
    return this.storage.getContainer(path)
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
