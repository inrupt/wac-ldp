import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('deleteContainer')

export async function deleteContainer (task: WacLdpTask, storage: BlobTree) {
  debug('operation deleteContainer!')
  const container = storage.getBlob(task.path)
  // TODO: check task.ifMatch
  await container.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
