import Debug from 'debug'
import { BufferTree, urlToPath, Member } from './BufferTree'
import { membersListAsQuadStream } from './membersListAsResourceData'
import { quadStreamFromBlob } from '../rdf/RdfLibStoreManager'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { RdfType, objectToStream, ResourceData, ResourceType, ResourceDataLdpBc, ResourceDataMissing, ResourceDataLdpRsNonContainer, ResourceDataLdpNr, streamToBuffer, makeResourceData, streamToObject, bufferToStream, determineRdfType } from '../rdf/ResourceDataUtils'
import { Quad } from '../rdf/StoreManager'

const debug = Debug('quad-and-blob-store')

export class QuadAndBlobStore {
  storage: BufferTree
  constructor (storage: BufferTree) {
    this.storage = storage
  }
  delete (url: URL) {
    return this.storage.getResourceNode(urlToPath(url)).delete()
  }
  async write (url: URL, resourceData: ResourceData): Promise<void> {
    const blob = this.storage.getResourceNode(urlToPath(url))
    if (resourceData.resourceType === ResourceType.LdpNr) {
      const bodyStream = (resourceData as ResourceDataLdpNr).getBody()
      const bodyBuffer = await streamToBuffer(bodyStream)
      const contentType: string = (resourceData as ResourceDataLdpNr).contentType
      const blobStream = objectToStream(makeResourceData(contentType, bodyBuffer.toString()))
      await blob.setData(blobStream)
    }
    if (resourceData.resourceType === ResourceType.LdpRsNonContainer) {
      const quadStream = (resourceData as ResourceDataLdpRsNonContainer).getQuads()
      const bodyBuffer = await streamToBuffer(quadStream)
      const contentType: string = (resourceData as ResourceDataLdpNr).contentType
      const blobStream = objectToStream(makeResourceData(contentType, bodyBuffer.toString()))
      await blob.setData(blobStream)
    }
  }
  async read (url: URL): Promise<ResourceData> {
    if (url.toString().substr(-1) === '/') {
      const members: Array<Member> | undefined = await this.storage.getMembers(urlToPath(url))
      const exists = (Array.isArray(members))
      if (exists) {
        const membersList: Array<Member> = members as Array<Member>
        return {
          resourceType: ResourceType.LdpBc,
          getMembers: this.storage.getMembers.bind(this.storage),
          getQuads: (preferMinimalContainer: boolean): ReadableStream<Quad> => {
            if (preferMinimalContainer) {
              return membersListAsQuadStream(url, [])
            } else {
              debug(membersList)
              return membersListAsQuadStream(url, membersList)
            }
          },
          etag: 'container'
        } as ResourceDataLdpBc
      } else {
        return {
          resourceType: ResourceType.Missing
        } as ResourceDataMissing
      }
    } else {
      const blob = this.storage.getResourceNode(urlToPath(url))

      const exists = await blob.exists()
      if (exists) {
        const blobData = await streamToObject(blob.getData())
        if (determineRdfType(blobData.contentType) === RdfType.Turtle) { // QuadAndBlobStore will use this format when storing quads in BlobTree
          const quadStream = await quadStreamFromBlob(blob, RdfType.Turtle)
          return {
            resourceType: ResourceType.LdpRsNonContainer,
            etag: blobData.etag,
            getQuads: () => quadStream
          } as ResourceDataLdpRsNonContainer
        }
        return {
          resourceType: ResourceType.LdpNr,
          etag: blobData.etag,
          contentType: blobData.contentType,
          getBody: () => bufferToStream(blobData.body)
        } as ResourceDataLdpNr
      } else {
        return {
          resourceType: ResourceType.Missing
        } as ResourceDataMissing
      }
    }
  }
}
