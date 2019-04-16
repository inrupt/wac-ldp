import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { BlobTree } from '../storage/BlobTree'
import { LdpTask } from '../api/http/HttpParser'

const debug = Debug('GlobReader')

export async function readGlob (task: LdpTask, storage: BlobTree): Promise<LdpResponse> {
  debug('LdpParserResult GlobReader!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithBody
  } as LdpResponse
}
