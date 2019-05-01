import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'

const debug = Debug('updateBlob')

export async function updateBlob (task: WacLdpTask, blob: Blob, appendOnly: boolean): Promise<WacLdpResponse> {
  debug('operation updateBlob!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
