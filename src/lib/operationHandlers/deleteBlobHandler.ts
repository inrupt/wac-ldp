import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream, ResourceData } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { applyPatch } from '../rdf/applyPatch'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'

const debug = Debug('delete-blob-handler')

export const deleteBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobUpdate),
  handle: async function (task: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    if (!skipWac) {
      await checkAccess({
        url: task.fullUrl(),
        webId: await task.webId(),
        origin: await task.origin(),
        requiredAccessModes: determineRequiredAccessModes(task.wacLdpTaskType()),
        rdfLayer
      } as AccessCheckTask) // may throw if access is denied
    }
    const resourceDataBefore = await getResourceDataAndCheckETag(task, rdfLayer)
    debug('operation deleteBlob!')
    const blob = rdfLayer.getLocalBlob(task.fullUrl())
    await blob.delete()
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
