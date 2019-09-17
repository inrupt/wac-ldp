import { WacLdpTask } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/StoreManager'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'
import IOperation from 'solid-server-ts/src/ldp/operations/IOperation'
import PermissionSet from 'solid-server-ts/src/permissions/PermissionSet'
import ResponseDescription from 'solid-server-ts/src/http/ResponseDescription'
import IRepresentation from 'solid-server-ts/src/ldp/IRepresentation'

const debug = Debug('unknown-operation-catch-all')

export class UnknownOperationCatchAll implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  async execute (): Promise<ResponseDescription> {
    return {}
  }
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager) {
    this.preferences = representationPreferences
    this.target = target
  }
  canHandle = () => true
  requiredPermissions = new PermissionSet({})
  handle = function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    debug('operation unknownOperation!')
    throw new ErrorResult(ResultType.MethodNotAllowed)
  }
}
