import IResourceStore from 'solid-server-ts/src/ldp/IResourceStore'
import IOperationFactory from 'solid-server-ts/src/ldp/operations/IOperationFactory'
import IRepresentation from 'solid-server-ts/src/ldp/IRepresentation'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import ICredentials from 'solid-server-ts/src/auth/ICredentials'
import PermissionSet from 'solid-server-ts/src/permissions/PermissionSet'
import IAuthorizer from 'solid-server-ts/src/auth/IAuthorizer'

export { WacLdp, WacLdpOptions, BEARER_PARAM_NAME } from './lib/core/WacLdp'
export { determineWebIdAndOrigin } from './lib/api/authentication/determineWebIdAndOrigin'
export { BlobTree, Path } from './lib/storage/BlobTree'
export { BlobTreeInMem } from './lib/storage/BlobTreeInMem'
export { BlobTreeNssCompat } from './lib/storage/BlobTreeNssCompat'
export { QuadAndBlobStore } from './lib/storage/QuadAndBlobStore'
export { ACL } from './lib/rdf/rdf-constants'

export class NssCompatResourceStore implements IResourceStore {
  async getRepresentation () {
    return {} as IRepresentation
  }
  async setRepresentation () {
    // ...
  }
  async addResource () {
    return {} as IResourceIdentifier
  }
  async modifyResource () {
    // ...
  }
  async deleteResource () {
    // ...
  }
}

export class DefaultOperationFactory implements IOperationFactory {
  resourceStore: IResourceStore
  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore
  }
  // ...
}

export class AclBasedAuthorizer implements IAuthorizer {
  resourceStore: IResourceStore
  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore
  }
  async ensurePermissions (agent: ICredentials,
    target: IResourceIdentifier,
    requiredPermissions: PermissionSet
  ): Promise<boolean> {
    return false
  }
}
