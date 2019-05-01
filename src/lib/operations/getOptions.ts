import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'

const debug = Debug('getOptions')

export async function getOptions (task: WacLdpTask, blob: Blob): Promise<WacLdpResponse> {
  return Promise.resolve({
    resultType: ResultType.OkayWithoutBody,
    resourceData: undefined,
    createdLocation: undefined,
    isContainer: task.isContainer
  })
}
