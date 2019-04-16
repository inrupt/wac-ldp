import Debug from 'debug'
import StorageProcessor from '../../processors/StorageProcessor'
import Processor from '../../processors/Processor'
import { LdpResponse, ResultType } from '../api/http/Responder'
import { LdpTask } from '../api/http/LdpParser'
import { makeResourceData, fromStream, toStream } from '../../ResourceData'

const debug = Debug('ResourceWriter')
export class BlobWriter extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ResourceWriter!')
    const resource = this.storage.getBlob(task.path)
    // FIXME: duplicate code with ResourceWriter. use inheritence with common ancestor?
    if (task.ifMatch) {
      const resourceData = await fromStream(await resource.getData())
      if (resourceData.etag !== task.ifMatch) {
        return {
          resultType: ResultType.PreconditionFailed
        } as LdpResponse
      }
    }
    const resultType = (resource.exists() ? ResultType.OkayWithoutBody : ResultType.Created)
    await resource.setData(toStream(makeResourceData(task.contentType, task.requestBody)))
    return {
      resultType
    } as LdpResponse
  }
}
