import Debug from 'debug'
import { BlobTree, urlToPath } from './BlobTree'
import { Member } from './Container'
import { membersListAsQuadStream } from './membersListAsResourceData'
import { quadStreamFromBlob } from '../rdf/RdfLibStoreManager'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { RdfType, objectToStream, ResourceData, ResourceType, ResourceDataLdpBc, ResourceDataMissing, ResourceDataLdpRsNonContainer, ResourceDataLdpNr } from '../rdf/ResourceDataUtils'

const debug = Debug('quad-and-blob-store')

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
  async getResourceData (url: URL): Promise<ResourceData> {
    if (url.toString().substr(-1) === '/') {
      const container = this.storage.getContainer(urlToPath(url))
      const exists = await container.exists()
      if (exists) {
        return {
          resourceType: ResourceType.LdpBc,
          getMembers: container.getMembers.bind(container),
          getQuads: (preferMinimalContainer: boolean): ReadableStream<Quad> => {
            let membersList: Array<Member>
            if (preferMinimalContainer) {
              membersList = []
            } else {
              membersList = await container.getMembers()
            }
            debug(membersList)
            return membersListAsQuadStream(url, membersList)
          },
          etag: 'container'
        } as ResourceDataLdpBc
      } else {
        return {
          resourceType: ResourceType.Missing
        } as ResourceDataMissing
      }
    } else {
      const blob = this.storage.getBlob(urlToPath(url))

      const exists = await blob.exists()
      if (exists) {
        const metaData = blob.getMetaData()
        if (metaData.contentType === 'text/turtle') { // QuadAndBlobStore will use this format when storing quads in BlobTree
          const quadStream = await quadStreamFromBlob(blob)
          return {
            resourceType: ResourceType.LdpRsNonContainer,
            etag: metaData.etag,
            getQuads: () => quadStream
          } as ResourceDataLdpRsNonContainer
        }
        return {
          resourceType: ResourceType.LdpNr,
          etag: metaData.etag,
          contentType: metaData.contentType,
          getBody: blob.getBody.bind(blob)
        } as ResourceDataLdpNr
      } else {
        return {
          resourceType: ResourceType.Missing
        } as ResourceDataMissing
      }
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
