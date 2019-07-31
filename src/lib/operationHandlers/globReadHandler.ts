import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/RdfLibStoreManager'
import { AccessCheckTask, checkAccess } from '../authorization/checkAccess'
import { ResourceData, streamToObject } from '../rdf/ResourceDataUtils'
import { mergeRdfSources } from '../rdf/mergeRdfSources'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('glob-read-handler')

export const globReadHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => {
    return (wacLdpTask.wacLdpTaskType() === TaskType.globRead)
  },
  requiredAccessModes: [ ACL.Read ],
  handle: async function (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // At this point will have checked read access over the
    // container, but need to collect all RDF sources, filter on access, and then
    // concatenate them.

    const metaData = await storeManager.getResourceData(wacLdpTask.fullUrl())
    if (!metaData) {
      throw new ErrorResult(ResultType.NotFound)
    }
    const containerMembers = (metaData.getMembers ? await metaData.getMembers() : [])
    const webId = await wacLdpTask.webId()
    const rdfSources: { [indexer: string]: ResourceData } = {}
    await Promise.all(containerMembers.map(async (member) => {
      debug('glob, considering member', member)
      if (member.isContainer) {// not an RDF source
        return
      }
      const blobUrl = new URL(member.name, wacLdpTask.fullUrl())
      const resourceData = await storeManager.getRepresentation(blobUrl)
      if (!resourceData) {
        throw new ErrorResult(ResultType.NotFound)
      }
      if (['text/turtle', 'application/ld+json'].indexOf(resourceData.contentType) === -1) { // not an RDF source
        return
      }
      try {
        if (!skipWac) {
          await checkAccess({
            url: blobUrl,
            isContainer: false,
            webId,
            origin: await wacLdpTask.origin(),
            requiredAccessModes: [ ACL.Read ],
            storeManager
          } as AccessCheckTask) // may throw if access is denied
        }
        rdfSources[member.name] = resourceData
        debug('Found RDF source', member.name)
      } catch (error) {
        if (error instanceof ErrorResult && error.resultType === ResultType.AccessDenied) {
          debug('access denied to blob in glob, skipping', blobUrl.toString())
        } else {
          debug('unexpected error for blob in glob, skipping', error.message, blobUrl.toString())
        }
      }
    }))

    return {
      resultType: (wacLdpTask.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData: await mergeRdfSources(rdfSources, wacLdpTask.rdfType()),
      createdLocation: undefined,
      isContainer: true
    } as WacLdpResponse
  }
}
