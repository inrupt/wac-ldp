import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from './Responder'
import { LdpTask } from './LdpParser'
import { Blob } from '../Blob'

const debug = Debug('ResourceReader')

export class BlobReader extends StorageProcessor implements Processor {
  async executeTask (task: LdpTask, resource: Blob): Promise<LdpResponse> {
    let result = {
    } as any
    if (!resource.exists()) {
      result.resultType = ResultType.NotFound
      return result
    }
    result.resourceData = await resource.getData()
    debug('result.resourceData set to ', result.resourceData)
    if (task.omitBody) {
      result.resultType = ResultType.OkayWithoutBody
    } else if (task.ifNoneMatch && task.ifNoneMatch.indexOf(result.resourceData.etag) !== -1) {
      result.resultType = ResultType.NotModified
    } else {
      result.resultType = ResultType.OkayWithBody
    }
    return result as LdpResponse
  }

  async process (task: LdpTask) {
    debug('LdpParserResult ResourceReader!')
    const resource = this.storage.getBlob(task.path)
    const result = await this.executeTask(task, resource)
    return result
  }
}
