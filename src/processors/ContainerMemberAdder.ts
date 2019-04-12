import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from './Responder'
import { LdpTask } from './LdpParser'
import uuid from 'uuid/v4'
import { makeResourceData } from '../ResourceData'

const debug = Debug('ContainerMemberAdder')

export class ContainerMemberAdder extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ContainerMemberAdder!')
    const resourcePath = task.path + uuid()
    const resource = this.storage.getBlob(resourcePath)
    await resource.setData(makeResourceData(task.contentType, task.requestBody))
    return {
      resultType: ResultType.Created,
      createdLocation: resourcePath
    } as LdpResponse
  }
}
