import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream, ResourceData } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { ACL } from '../rdf/rdf-constants'
import OperationHandler from './OperationHandler'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'
import IOperation from 'solid-server-ts/src/ldp/operations/IOperation'
import ResponseDescription from 'solid-server-ts/src/http/ResponseDescription'
import PermissionSet from 'solid-server-ts/src/permissions/PermissionSet'

const debug = Debug('delete-blob-handler')

export class DeleteBlobHandler implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  async execute (): Promise<ResponseDescription> {
    return {}
  }
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager) {
    this.preferences = representationPreferences
    this.target = target
  }
  canHandle () {
    return ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.blobDelete)
  }
  requiredPermissions = new PermissionSet({ write: true })
  async handle (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    const resourceDataBefore = await getResourceDataAndCheckETag(task, storeManager)
    debug('operation deleteBlob!')
    const blob = storeManager.getLocalBlob(task.fullUrl())
    await blob.delete()
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}
