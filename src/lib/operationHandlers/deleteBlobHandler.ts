import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('delete-blob-handler')

export const deleteBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobDelete),
  requiredAccessModes: [ ACL.Write ],
  handle: async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    debug('getResourceDataAndCheckETag')
    await getResourceDataAndCheckETag(task, storeManager)
    debug('operation deleteBlob!')
    // await storeManager.delete(task.fullUrl())
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
// maybe operation handlers should get only one interface, namely StoreManager. that way
// we can be sure cache gets updated
// if you read/write a resource that is in cache, it gets updated there, if not it's write-through
// if it's a GET that requires translation then it's up to the read-blob handler to first look at
// the metadata and then load into cache if necessary
// this is also nice because it hides urlToPath from the handlers.