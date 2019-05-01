import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { streamToObject } from '../util/ResourceDataUtils'

const debug = Debug('readBlob')

export async function readBlob (task: WacLdpTask, blob: Blob): Promise<WacLdpResponse> {
  let result = {
  } as any
  const exists = await blob.exists()
  if (!exists) {
    result.resultType = ResultType.NotFound
    return result
  }
  result.resourceData = await streamToObject(await blob.getData())
  debug('result.resourceData set to ', result.resourceData)
  if (task.omitBody) {
    result.resultType = ResultType.OkayWithoutBody
  } else {
    result.resultType = ResultType.OkayWithBody
  }
  return result as WacLdpResponse
}
