import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { Container } from '../storage/Container'
import { WacLdpTask } from '../api/http/HttpParser'

const debug = Debug('readGlob')

export async function readGlob (task: WacLdpTask, container: Container): Promise<WacLdpResponse> {
  debug('operation readGlob!')
  // TODO: implement
  return {
    resultType: ResultType.OkayWithBody
  } as WacLdpResponse
}
