import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('ContainerDeleter')

export async function deleteContainer (task: LdpTask, storage: BlobTree) {
  debug('LdpParserResult ContainerDeleter!')
  const container = storage.getBlob(task.path)
  // TODO: check task.ifMatch
  await container.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as LdpResponse
}
