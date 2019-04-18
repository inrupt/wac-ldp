import Debug from 'debug'
import { WacLdpResponse, ResultType, ErrorResult } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('unknownOperation')

export async function unknownOperation (task: WacLdpTask, storage: BlobTree): Promise<WacLdpResponse> {
  debug('operation unknownOperation!')
  throw new ErrorResult(ResultType.MethodNotAllowed)
}
