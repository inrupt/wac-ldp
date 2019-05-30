import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { RdfFetcher } from '../rdf/RdfFetcher'
import { resourceDataToRdf } from '../rdf/mergeRdfSources'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { applyQuery } from '../rdf/applyQuery'

const debug = Debug('write-blob-handler')

async function getBlobAndCheckETag (wacLdpTask: WacLdpTask, rdfFetcher: RdfFetcher): Promise<Blob> {
  const blob: Blob = rdfFetcher.getLocalBlob(wacLdpTask.fullUrl())
  const data = await blob.getData()
  debug(data, wacLdpTask)
  if (data) { // resource exists
    if (wacLdpTask.ifNoneMatchStar()) { // If-None-Match: * -> resource should not exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const resourceData = await streamToObject(data)
    const ifMatch = wacLdpTask.ifMatch()
    if (ifMatch && resourceData.etag !== ifMatch) { // If-Match -> ETag should match
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const ifNoneMatchList: Array<string> | undefined = wacLdpTask.ifNoneMatchList()
    if (ifNoneMatchList && ifNoneMatchList.indexOf(resourceData.etag) !== -1) { // ETag in blacklist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  } else { // resource does not exist
    if (wacLdpTask.ifMatch()) { // If-Match -> ETag should match so resource should first exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  }
  return blob
}

export const writeBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobWrite),
  handle: async function (task: WacLdpTask, aud: string, rdfFetcher: RdfFetcher, skipWac: boolean): Promise<WacLdpResponse> {
    if (!skipWac) {
      await checkAccess({
        url: task.fullUrl(),
        isContainer: task.isContainer(),
        webId: await task.webId(),
        origin: task.origin(),
        wacLdpTaskType: task.wacLdpTaskType(),
        rdfFetcher
      } as AccessCheckTask) // may throw if access is denied
    }
    const blob = await getBlobAndCheckETag(task, rdfFetcher)
    const blobExists: boolean = await blob.exists()
    debug('operation writeBlob!', blobExists)
    const resultType = (blobExists ? ResultType.OkayWithoutBody : ResultType.Created)
    const contentType: string | undefined = task.contentType()
    const resourceData = makeResourceData(contentType ? contentType : '', await task.requestBody())
    await blob.setData(objectToStream(resourceData))
    return {
      resultType,
      createdLocation: (blobExists ? undefined : task.fullUrl())
    } as WacLdpResponse
  }
}
