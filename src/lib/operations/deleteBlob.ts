import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'
import { fromStream } from '../../ResourceData'

const debug = Debug('deleteBlob')

export async function deleteBlob (task: WacLdpTask, storage: BlobTree): Promise<WacLdpResponse> {
  debug('operation deleteBlob!')
  const blob = storage.getBlob(task.path)
  // FIXME: duplicate code with writeBlob. use inheritence with common ancestor?
  if (task.ifMatch) {
    const resourceData = await fromStream(await blob.getData())
    if (resourceData.etag !== task.ifMatch) {
      return {
        resultType: ResultType.PreconditionFailed
      } as WacLdpResponse
    }
  }
  await blob.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
