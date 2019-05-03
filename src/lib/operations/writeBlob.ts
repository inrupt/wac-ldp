import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'
import { makeResourceData, streamToObject, objectToStream } from '../util/ResourceDataUtils'

const debug = Debug('writeBlob')
export async function writeBlob (task: WacLdpTask, blob: Blob) {
  const blobExists: boolean = await blob.exists()
  debug('operation writeBlob!', blobExists)
  const resultType = (blobExists ? ResultType.OkayWithoutBody : ResultType.Created)
  const resourceData = makeResourceData(task.contentType ? task.contentType : '', task.requestBody ? task.requestBody : '')
  await blob.setData(objectToStream(resourceData))
  return {
    resultType,
    createdLocation: (blobExists ? undefined : task.fullUrl)
  } as WacLdpResponse
}
