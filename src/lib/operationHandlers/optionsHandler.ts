import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/RdfLibStoreManager'

const debug = Debug('options-handler')

export const optionsHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => {
    return (wacLdpTask.wacLdpTaskType() === TaskType.getOptions)
  },
  requiredAccessModes: [],
  handle: function (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    return Promise.resolve({
      resultType: ResultType.OkayWithoutBody,
      resourceData: undefined,
      createdLocation: undefined,
      isContainer: wacLdpTask.isContainer()
    })
  }
}
