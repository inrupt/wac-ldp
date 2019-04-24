import Debug from 'debug'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { membersListAsResourceData } from '../util/membersListAsResourceData'
import { Container } from '../storage/Container'

const debug = Debug('readContainer')

export async function readContainer (task: WacLdpTask, container: Container): Promise<WacLdpResponse> {
  debug('operation readContainer!')
  debug(container)
  const membersList = await container.getMembers()
  debug(membersList)
  const resourceData = await membersListAsResourceData(task.path, membersList, task.asJsonLd)
  debug(resourceData)
  return {
    resultType: (task.omitBody ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
    resourceData,
    isContainer: true
  } as WacLdpResponse
}
