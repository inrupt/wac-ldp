import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/RdfLibStoreManager'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('update-blob-handler')

export const updateBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobUpdate),
  requiredAccessModes: [ ACL.Read, ACL.Write ],
  handle: async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    const resourceData = await getResourceDataAndCheckETag(task, storeManager)
    if (!resourceData) {
      throw new ErrorResult(ResultType.NotFound)
    }
    debug('operation updateBlob!', { appendOnly })
    await storeManager.patch(task.fullUrl(), await task.requestBody() || '', appendOnly)
    await storeManager.save(task.fullUrl())
    storeManager.flushCache(task.fullUrl())
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
