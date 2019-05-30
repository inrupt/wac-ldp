import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream, ResourceData } from '../rdf/ResourceDataUtils'
import { RdfFetcher } from '../rdf/RdfFetcher'
import { applyPatch } from '../rdf/applyPatch'

const debug = Debug('delete-blob-handler')

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

export const deleteBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobUpdate),
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
    debug('operation deleteBlob!')
    await blob.delete()
    return {
      resultType: ResultType.OkayWithoutBody
    } as WacLdpResponse
  }
}
