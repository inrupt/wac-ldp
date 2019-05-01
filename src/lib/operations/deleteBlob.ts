import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'
import { streamToObject } from '../util/ResourceDataUtils'

const debug = Debug('deleteBlob')

export async function deleteBlob (task: WacLdpTask, blob: Blob): Promise<WacLdpResponse> {
  debug('operation deleteBlob!')
  await blob.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
