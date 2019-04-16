import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from './Responder'
import { LdpTask } from './LdpParser'
import membersListAsResourceData from '../membersListAsResourceData'

const debug = Debug('ContainerReader')

export class ContainerReader extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    const container = this.storage.getContainer(task.path)
    const membersList = await container.getMembers()
    const resourceData = membersListAsResourceData(task.path, membersList, task.asJsonLd)
    return {
      resultType: (task.omitBody ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData,
      createdLocation: undefined,
      isContainer: task.isContainer,
      lock: container,
      httpRes: undefined
    } as LdpResponse
  }
}
