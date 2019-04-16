import Debug from 'debug'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import { membersListAsResourceData } from '../../membersListAsResourceData'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('readContainer')

export async function readContainer (task: LdpTask, storage: BlobTree): Promise<LdpResponse> {
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
  } as LdpResponse
}
