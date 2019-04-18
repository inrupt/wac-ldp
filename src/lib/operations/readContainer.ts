import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { membersListAsResourceData } from '../util/membersListAsResourceData'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('readContainer')

export async function readContainer (task: WacLdpTask, storage: BlobTree): Promise<WacLdpResponse> {
  debug('operation readContainer!')
  const container = storage.getContainer(task.path)
  debug(container)
  const membersList = await container.getMembers()
  debug(membersList)
  const resourceData = await membersListAsResourceData(task.path, membersList, task.asJsonLd)
  debug(resourceData)
  return {
    resultType: (task.omitBody ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
    resourceData,
    createdLocation: undefined,
    isContainer: task.isContainer,
    lock: container,
    httpRes: undefined
  } as WacLdpResponse
}
