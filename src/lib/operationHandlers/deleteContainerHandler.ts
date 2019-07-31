import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { StoreManager } from '../rdf/StoreManager'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('delete-container-handler')

export const deleteContainerHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerDelete),
  requiredAccessModes: [ ACL.Write ],
  handle: async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    await storeManager.delete(task.fullUrl())
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
