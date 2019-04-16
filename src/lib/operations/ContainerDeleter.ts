import Debug from 'debug'
import StorageProcessor from '../../processors/StorageProcessor'
import Processor from '../../processors/Processor'
import { LdpResponse, ResultType } from '../api/http/Responder'
import { LdpTask } from '../api/http/LdpParser'

const debug = Debug('ContainerDeleter')

export class ContainerDeleter extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ContainerDeleter!')
    const container = this.storage.getBlob(task.path)
    // TODO: check task.ifMatch
    await container.delete()
    return {
      resultType: ResultType.OkayWithoutBody
    } as LdpResponse
  }
}
