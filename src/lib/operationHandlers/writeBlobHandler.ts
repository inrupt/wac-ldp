import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { streamToObject, makeResourceData, objectToStream, ResourceData } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { resourceDataToRdf } from '../rdf/mergeRdfSources'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { applyQuery } from '../rdf/applyQuery'

const debug = Debug('write-blob-handler')

export const writeBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobWrite),
  handle: async function (task: WacLdpTask, rdfLayer: RdfLayer, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    const resourceDataBefore = await getResourceDataAndCheckETag(task, rdfLayer)
    const blobExists: boolean = !!resourceDataBefore
    debug('operation writeBlob!', blobExists)
    // see https://github.com/inrupt/wac-ldp/issues/61
    // and https://github.com/inrupt/wac-ldp/issues/60
    const ifMatchHeaderPresent = task.ifMatch() || task.ifNoneMatchStar()
    debug('checking If-Match presence', ifMatchHeaderPresent, task.ifMatch(), task.ifNoneMatchStar(), task.ifMatchRequired, blobExists)
    if (blobExists || (task.ifMatchRequired && !ifMatchHeaderPresent)) {
      debug('attempt to overwrite existing resource')
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const resultType = (blobExists ? ResultType.OkayWithoutBody : ResultType.Created)
    const contentType: string | undefined = task.contentType()
    debug('contentType', contentType)
    const resourceData = makeResourceData(contentType ? contentType : '', await task.requestBody())
    await rdfLayer.setData(task.fullUrl(), objectToStream(resourceData))
    debug('write blob handler changed a resource', task.fullUrl())
    return {
      resultType,
      createdLocation: (blobExists ? undefined : task.fullUrl()),
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
