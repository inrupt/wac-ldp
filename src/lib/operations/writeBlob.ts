import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'
import { makeResourceData, fromStream, toStream } from '../util/ResourceDataUtils'

const debug = Debug('writeBlob')
export async function writeBlob (task: WacLdpTask, blob: Blob) {
  debug('operation writeBlob!')
  const resultType = (blob.exists() ? ResultType.OkayWithoutBody : ResultType.Created)
  await blob.setData(toStream(makeResourceData(task.contentType, task.requestBody)))
  return {
    resultType
  } as WacLdpResponse
}
