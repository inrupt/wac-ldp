import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from './Responder'
import { LdpTask } from './LdpParser'

const debug = Debug('ResourceDeleter')

export class BlobDeleter extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ResourceDeleter!')
    const resource = this.storage.getBlob(task.path)
    // FIXME: duplicate code with ResourceWriter. use inheritence with common ancestor?
    if (task.ifMatch) {
      const resourceData = await resource.getData()
      if (resourceData.etag !== task.ifMatch) {
        return {
          resultType: ResultType.PreconditionFailed
        } as LdpResponse
      }
    }
    await resource.delete()
    return {
      resultType: ResultType.OkayWithoutBody
    } as LdpResponse
  }
}
