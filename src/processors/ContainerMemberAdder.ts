import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from '../lib/api/http/Responder'
import { LdpTask } from '../lib/api/http/LdpParser'
import uuid from 'uuid/v4'
import { makeResourceData, toStream } from '../ResourceData'

const debug = Debug('ContainerMemberAdder')

export class ContainerMemberAdder extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ContainerMemberAdder!')
    const resourcePath = task.path + uuid()
    const resource = this.storage.getBlob(resourcePath)
    await resource.setData(toStream(makeResourceData(task.contentType, task.requestBody)))
    return {
      resultType: ResultType.Created,
      createdLocation: resourcePath
    } as LdpResponse
  }
}
