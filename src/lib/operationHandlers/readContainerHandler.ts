import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { Member } from '../storage/Container'
import { membersListAsResourceData } from '../rdf/membersListAsResourceData'

const debug = Debug('read-container-handler')

export const readContainerHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerRead),
  handle: async function (task: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    if (!skipWac) {
      await checkAccess({
        url: task.fullUrl(),
        isContainer: task.isContainer(),
        webId: await task.webId(),
        origin: await task.origin(),
        requiredAccessModes: determineRequiredAccessModes(task.wacLdpTaskType()),
        rdfLayer
      } as AccessCheckTask) // may throw if access is denied
    }
    let container: any
    container = rdfLayer.getLocalContainer(task.fullUrl())

    debug('operation readContainer!')
    debug(container)
    let membersList: Array<Member>
    if (task.preferMinimalContainer()) {
      membersList = []
    } else {
      membersList = await container.getMembers()
    }
    debug(membersList)
    const resourceData = await membersListAsResourceData(task.fullUrl(), membersList, task.rdfType())
    debug(resourceData)
    return {
      resultType: (task.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData,
      isContainer: true
    } as WacLdpResponse
  }
}
