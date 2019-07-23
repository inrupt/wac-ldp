import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { Member } from '../storage/Container'
import { membersListAsResourceData } from '../rdf/membersListAsResourceData'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('read-container-handler')

export const readContainerHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerRead),
  requiredAccessModes: [ ACL.Read ],
  handle: async function (task: WacLdpTask, rdfLayer: RdfLayer, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
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
