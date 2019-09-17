import { WacLdpTask } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/StoreManager'
import IResourceIdentifier from 'solid-server-ts/src/ldp/IResourceIdentifier'
import IRepresentationPreferences from 'solid-server-ts/src/ldp/IRepresentationPreferences'

const debug = Debug('unknown-operation-catch-all')

export class UnknownOperationCatchAll {
  constructor(method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, task: WacLdpTask, resourceStore: StoreManager) {}
  canHandle = (wacLdpTask: WacLdpTask) => true
  requiredPermissions = []
  handle = function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    debug('operation unknownOperation!')
    throw new ErrorResult(ResultType.MethodNotAllowed)
  }
}
