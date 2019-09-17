import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { Member } from '../storage/Container'
import { membersListAsResourceData } from '../storage/membersListAsResourceData'
import { ACL } from '../rdf/rdf-constants'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'

const debug = Debug('delete-container-handler')

export class DeleteContainerHandler {
  constructor(method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, task: WacLdpTask, resourceStore: StoreManager) {}
  canHandle = (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerDelete)
  requiredPermissions = [ ACL.Write ]
  async handle (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    let container: any
    container = storeManager.getLocalContainer(task.fullUrl())

    debug('operation deleteContainer!')
    debug(container)
    await container.delete()
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
