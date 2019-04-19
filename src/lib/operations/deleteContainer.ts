import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Container } from '../storage/Container'

const debug = Debug('deleteContainer')

export async function deleteContainer (task: WacLdpTask, container: Container) {
  debug('operation deleteContainer!')
  await container.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
