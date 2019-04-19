import Debug from 'debug'
import { WacLdpResponse, ResultType, ErrorResult } from '../api/http/HttpResponder'

const debug = Debug('unknownOperation')

export async function unknownOperation (): Promise<WacLdpResponse> {
  debug('operation unknownOperation!')
  throw new ErrorResult(ResultType.MethodNotAllowed)
}
