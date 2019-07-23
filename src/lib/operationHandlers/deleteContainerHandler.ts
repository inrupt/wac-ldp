import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../authorization/checkAccess'

import Debug from 'debug'

import { streamToObject } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { Member } from '../storage/Container'
import { membersListAsResourceData } from '../rdf/membersListAsResourceData'

const debug = Debug('delete-container-handler')

export const deleteContainerHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerDelete),
  handle: async function (task: WacLdpTask, rdfLayer: RdfLayer, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    let container: any
    container = rdfLayer.getLocalContainer(task.fullUrl())

    debug('operation deleteContainer!')
    debug(container)
    await container.delete()
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
