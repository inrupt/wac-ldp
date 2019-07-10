import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream, ResourceData } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'

const debug = Debug('update-blob-handler')

export const updateBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobUpdate),
  handle: async function (task: WacLdpTask, rdfLayer: RdfLayer, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    const resourceData = await getResourceDataAndCheckETag(task, rdfLayer)
    if (!resourceData) {
      throw new ErrorResult(ResultType.NotFound)
    }
    debug('operation updateBlob!', { appendOnly })
    const turtleDoc: string = await rdfLayer.applyPatch(resourceData, await task.requestBody() || '', task.fullUrl(), appendOnly)
    const blob = rdfLayer.getLocalBlob(task.fullUrl())
    await blob.setData(await objectToStream(makeResourceData(resourceData.contentType, turtleDoc)))
    rdfLayer.flushCache(task.fullUrl())
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
