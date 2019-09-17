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

export class DefaultOperationFactory implements IOperationFactory {
  resourceStore: IResourceStore
  operationHandlers: Array<OperationHandler>

  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore

    this.operationHandlers = [
      new OptionsHandler(),
      new GlobReadHandler(),
      new ContainerMemberAddHandler(),
      new ReadContainerHandler(),
      new DeleteContainerHandler(),
      new ReadBlobHandler(),
      new WriteBlobHandler(),
      new UpdateBlobHandler(),
      new DeleteBlobHandler(),
      new UnknownOperationCatchAll()
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
