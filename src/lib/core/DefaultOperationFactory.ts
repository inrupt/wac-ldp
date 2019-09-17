import IOperationFactory from 'solid-server-ts/src/ldp/operations/IOperationFactory'
import IResourceStore from 'solid-server-ts/src/ldp/IResourceStore'
import { OptionsHandler } from '../operationHandlers/OptionsHandler'
import { GlobReadHandler } from '../operationHandlers/GlobReadHandler'
import { ContainerMemberAddHandler } from '../operationHandlers/ContainerMemberAddHandler'
import { ReadContainerHandler } from '../operationHandlers/ReadContainerHandler'
import { DeleteContainerHandler } from '../operationHandlers/DeleteContainerHandler'
import { ReadBlobHandler } from '../operationHandlers/ReadBlobHandler'
import { WriteBlobHandler } from '../operationHandlers/WriteBlobHandler'
import { UpdateBlobHandler } from '../operationHandlers/UpdateBlobHandler'
import { DeleteBlobHandler } from '../operationHandlers/DeleteBlobHandler'
import { UnknownOperationCatchAll } from '../operationHandlers/UnknownOperationCatchAll'
import { WacLdpTask } from '../api/http/HttpParser'
import { StoreManager } from '../rdf/StoreManager'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../authorization/checkAccess'
import debug from 'debug'
import OperationHandler from '../operationHandlers/OperationHandler'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'
import IOperation from 'solid-server-ts/src/ldp/operations/IOperation'
import PermissionSet from 'solid-server-ts/src/permissions/PermissionSet'

export class DefaultOperationFactory implements IOperationFactory {
  resourceStore: IResourceStore
  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore
  }
  createOperation (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences): IOperation {
    const operationHandlers = [
      new OptionsHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new GlobReadHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new ContainerMemberAddHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new ReadContainerHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new DeleteContainerHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new ReadBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new WriteBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new UpdateBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new DeleteBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager),
      new UnknownOperationCatchAll(method, target, representationPreferences, this.resourceStore as StoreManager)
    ]
    for (let i = 0; i < operationHandlers.length; i++) {
      if (operationHandlers[i].canHandle()) {
        return operationHandlers[i]
      }
    }
    throw new ErrorResult(ResultType.InternalServerError)
  }

  async handleOperation (task: WacLdpTask, skipWac: boolean, aud: string): Promise<WacLdpResponse> {
    const handler = this.createOperation(task.method, task.target, task)
    let appendOnly = false
    if (!skipWac) {
      appendOnly = await checkAccess({
        url: task.fullUrl(),
        isContainer: task.isContainer(),
        webId: await task.webId(),
        origin: await task.origin(),
        requiredPermissions: [], // FIXME: permissionSetToUrlArray(handler.requiredPermissions),
        storeManager: this.resourceStore as StoreManager
      } as AccessCheckTask) // may throw if access is denied
    }
    // debug('calling operation handler', i, task, this.aud, skipWac, appendOnly)
    const responseDescription = await handler.execute()
    return responseDescription as WacLdpResponse
  }
}
