import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/StoreManager'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'

const debug = Debug('options-handler')

export class OptionsHandler {
  constructor(method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, task: WacLdpTask, resourceStore: StoreManager) {}
  canHandle = (wacLdpTask: WacLdpTask) => {
    return (wacLdpTask.wacLdpTaskType() === TaskType.getOptions)
  }
  requiredPermissions = []
  handle = function (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    return Promise.resolve({
      resultType: ResultType.OkayWithoutBody,
      resourceData: undefined,
      createdLocation: undefined,
      isContainer: wacLdpTask.isContainer()
    })
  }
}
