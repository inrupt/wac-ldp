import Debug from 'debug'
import StorageProcessor from '../../processors/StorageProcessor'
import Processor from '../../processors/Processor'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import uuid from 'uuid/v4'
import { makeResourceData, toStream } from '../../ResourceData'

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
