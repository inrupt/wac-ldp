import IOperationFactory from 'solid-server-ts/src/ldp/operations/IOperationFactory'
import IResourceStore from 'solid-server-ts/src/ldp/IResourceStore'
import { optionsHandler } from '../operationHandlers/optionsHandler'
import { globReadHandler } from '../operationHandlers/globReadHandler'
import { ContainerMemberAddHandler } from '../operationHandlers/containerMemberAddHandler'
import { readContainerHandler } from '../operationHandlers/readContainerHandler'
import { deleteContainerHandler } from '../operationHandlers/deleteContainerHandler'
import { readBlobHandler } from '../operationHandlers/readBlobHandler'
import { writeBlobHandler } from '../operationHandlers/writeBlobHandler'
import { updateBlobHandler } from '../operationHandlers/updateBlobHandler'
import { DeleteBlobHandler } from '../operationHandlers/deleteBlobHandler'
import { unknownOperationCatchAll } from '../operationHandlers/unknownOperationCatchAll'
import { WacLdpTask } from '../api/http/HttpParser'
import { StoreManager } from '../rdf/StoreManager'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../authorization/checkAccess'
import debug from 'debug'
import OperationHandler from '../operationHandlers/OperationHandler'

export class DefaultOperationFactory implements IOperationFactory {
  resourceStore: IResourceStore
  operationHandlers: Array<OperationHandler>

  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore

    this.operationHandlers = [
      optionsHandler,
      globReadHandler,
      new ContainerMemberAddHandler(),
      readContainerHandler,
      deleteContainerHandler,
      readBlobHandler,
      writeBlobHandler,
      updateBlobHandler,
      new DeleteBlobHandler(),
      unknownOperationCatchAll
    ]
  }

  async handleOperation (task: WacLdpTask, skipWac: boolean, aud: string): Promise<WacLdpResponse> {
    for (let i = 0; i < this.operationHandlers.length; i++) {
      if (this.operationHandlers[i].canHandle(task)) {
        let appendOnly = false
        if (!skipWac) {
          appendOnly = await checkAccess({
            url: task.fullUrl(),
            isContainer: task.isContainer(),
            webId: await task.webId(),
            origin: await task.origin(),
            requiredPermissions: this.operationHandlers[i].requiredPermissions,
            storeManager: this.resourceStore as StoreManager
          } as AccessCheckTask) // may throw if access is denied
        }
        // debug('calling operation handler', i, task, this.aud, skipWac, appendOnly)
        return this.operationHandlers[i].handle(task, this.resourceStore as StoreManager, aud, skipWac, appendOnly)
      }
    }
    throw new ErrorResult(ResultType.InternalServerError)
  }
}
