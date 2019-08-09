// import { ResourceNode } from '../storage/ResourceNode'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

// import { streamToObject, ResourceData } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { Child } from '../storage/BufferTree'
import { membersListAsResourceData } from '../storage/membersListAsResourceData'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('read-container-handler')

export const readContainerHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerRead),
  requiredAccessModes: [ ACL.Read ],
  handle: async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    throw new Error('TODO: use StoreManager')
    // const resourceData: ResourceData | undefined = await storeManager.getResourceData(task.fullUrl(), {
    //   preferMinimalContainer: task.preferMinimalContainer()
    // })
    // return {
    //   resultType: (task.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
    //   resourceData,
    //   isContainer: true
    // } as WacLdpResponse
  }
}
