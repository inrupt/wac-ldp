import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { BlobTree } from '../storage/BlobTree'
import { LdpTask } from '../api/http/HttpParser'

const debug = Debug('readGlob')

export async function readGlob (task: LdpTask, storage: BlobTree): Promise<LdpResponse> {
  debug('operation readGlob!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithBody
  } as LdpResponse
}
