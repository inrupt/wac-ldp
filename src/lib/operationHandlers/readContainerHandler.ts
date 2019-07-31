import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject, ResourceData } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/RdfLibStoreManager'
import { Member } from '../storage/Container'
import { membersListAsResourceData } from '../storage/membersListAsResourceData'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('read-container-handler')

export const readContainerHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerRead),
  requiredAccessModes: [ ACL.Read ],
  handle: async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    const resourceData: ResourceData | undefined = await storeManager.getRepresentation(task.fullUrl(), {
      preferMinimalContainer: task.preferMinimalContainer()
    })
    return {
      resultType: (task.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData,
      isContainer: true
    } as WacLdpResponse
  }
}
