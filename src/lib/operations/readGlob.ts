import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { BlobTree } from '../storage/BlobTree'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('readGlob')

export async function readGlob (task: WacLdpTask, storage: BlobTree): Promise<WacLdpResponse> {
  debug('operation readGlob!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithBody
  } as WacLdpResponse
}
