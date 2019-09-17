import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/StoreManager'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'
import IOperation from 'solid-server-ts/src/ldp/operations/IOperation'
import ResponseDescription from 'solid-server-ts/src/http/ResponseDescription'
import PermissionSet from 'solid-server-ts/src/permissions/PermissionSet'
import IResourceStore from 'solid-server-ts/src/ldp/IResourceStore'

const debug = Debug('options-handler')

export class OptionsHandler implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  resourceStore: IResourceStore
  operationOptions: any
  async execute (): Promise<ResponseDescription> {
    return this.handle(this.preferences as WacLdpTask, this.resourceStore as StoreManager,
      this.operationOptions.aud, this.operationOptions.skipWac, this.operationOptions.appendOnly)
  }
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager, operationOptions: any) {
    this.preferences = representationPreferences
    this.target = target
    this.resourceStore = resourceStore
    this.operationOptions = operationOptions
  }
  canHandle = () => {
    return ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.getOptions)
  }
  requiredPermissions = new PermissionSet({})
  handle = function (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    return Promise.resolve({
      resultType: ResultType.OkayWithoutBody,
      resourceData: undefined,
      createdLocation: undefined,
      isContainer: wacLdpTask.isContainer()
    })
  }
}
