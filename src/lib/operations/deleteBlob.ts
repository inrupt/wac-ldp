import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'
import { fromStream } from '../../ResourceData'

const debug = Debug('deleteBlob')

export async function deleteBlob (task: LdpTask, storage: BlobTree): Promise<LdpResponse> {
  debug('LdpParserResult ResourceDeleter!')
  const blob = storage.getBlob(task.path)
  // FIXME: duplicate code with ResourceWriter. use inheritence with common ancestor?
  if (task.ifMatch) {
    const resourceData = await fromStream(await blob.getData())
    if (resourceData.etag !== task.ifMatch) {
      return {
        resultType: ResultType.PreconditionFailed
      } as LdpResponse
    }
  }
  await blob.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as LdpResponse
}
