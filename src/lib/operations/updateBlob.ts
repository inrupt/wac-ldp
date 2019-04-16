import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('updateBlob')

export async function updateBlob (task: LdpTask, storage: BlobTree): Promise<LdpResponse> {
  debug('LdpParserResult updateBlob!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithoutBody
  } as LdpResponse
}
