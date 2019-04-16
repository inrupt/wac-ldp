import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from '../lib/api/http/Responder'
import { LdpTask } from '../lib/api/http/LdpParser'

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
