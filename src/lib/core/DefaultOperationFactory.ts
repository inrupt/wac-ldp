import IOperationFactory from 'solid-server-ts/src/ldp/operations/IOperationFactory'
import IResourceStore from 'solid-server-ts/src/ldp/IResourceStore'

export class DefaultOperationFactory implements IOperationFactory {
  resourceStore: IResourceStore
  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore
  }
  // ...
}
