import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('deleteContainer')

export async function deleteContainer (task: LdpTask, storage: BlobTree) {
  debug('operation deleteContainer!')
  const container = storage.getBlob(task.path)
  // TODO: check task.ifMatch
  await container.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as LdpResponse
}
