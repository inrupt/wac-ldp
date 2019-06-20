import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream, ResourceData } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { applyPatch } from '../rdf/applyPatch'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'

const debug = Debug('update-blob-handler')

export const updateBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobUpdate),
  handle: async function (task: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    let appendOnly = false
    if (!skipWac) {
      appendOnly = await checkAccess({
        url: task.fullUrl(),
        isContainer: task.isContainer(),
        webId: await task.webId(),
        origin: await task.origin(),
        requiredAccessModes: determineRequiredAccessModes(task.wacLdpTaskType()),
        rdfLayer
      } as AccessCheckTask) // may throw if access is denied
    }
    const resourceData = await getResourceDataAndCheckETag(task, rdfLayer)
    if (!resourceData) {
      throw new ErrorResult(ResultType.NotFound)
    }
    debug('operation updateBlob!', { appendOnly })
    const turtleDoc: string = await applyPatch(resourceData, await task.requestBody() || '', task.fullUrl(), appendOnly)
    const blob = rdfLayer.getLocalBlob(task.fullUrl())
    await blob.setData(await objectToStream(makeResourceData(resourceData.contentType, turtleDoc)))
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
