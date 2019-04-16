import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('updateBlob')

export async function updateBlob (task: WacLdpTask, storage: BlobTree): Promise<WacLdpResponse> {
  debug('operation updateBlob!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
