import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'
import { makeResourceData, fromStream, toStream } from '../../ResourceData'

const debug = Debug('writeBlob')
export async function writeBlob (task: WacLdpTask, storage: BlobTree) {
  debug('operation writeBlob!')
  const blob = storage.getBlob(task.path)
  // FIXME: duplicate code with ResourceWriter. use inheritence with common ancestor?
  if (task.ifMatch) {
    const resourceData = await fromStream(await blob.getData())
    if (resourceData.etag !== task.ifMatch) {
      return {
        resultType: ResultType.PreconditionFailed
      } as WacLdpResponse
    }
  }
  const resultType = (blob.exists() ? ResultType.OkayWithoutBody : ResultType.Created)
  await blob.setData(toStream(makeResourceData(task.contentType, task.requestBody)))
  return {
    resultType
  } as WacLdpResponse
}
