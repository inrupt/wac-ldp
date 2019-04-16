import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { membersListAsResourceData } from '../../membersListAsResourceData'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('readContainer')

export async function readContainer (task: WacLdpTask, storage: BlobTree): Promise<WacLdpResponse> {
  debug('operation readContainer!')
  const container = storage.getContainer(task.path)
  const membersList = await container.getMembers()
  const resourceData = membersListAsResourceData(task.path, membersList, task.asJsonLd)
  return {
    resultType: (task.omitBody ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
    resourceData,
    createdLocation: undefined,
    isContainer: task.isContainer,
    lock: container,
    httpRes: undefined
  } as WacLdpResponse
}
