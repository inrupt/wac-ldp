
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { WriteBlobHandler } from './WriteBlobHandler'
import { ACL } from '../rdf/rdf-constants'
import OperationHandler from './OperationHandler'

const debug = Debug('container-member-add-handler')

export class ContainerMemberAddHandler implements OperationHandler {
  canHandle (wacLdpTask: WacLdpTask) {
    return (wacLdpTask.wacLdpTaskType() === TaskType.containerMemberAdd)
  }
  requiredPermissions: Array < URL >
  constructor () {
    this.requiredPermissions = [ ACL.Append ]
  }
  async handle (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // We will convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend

    wacLdpTask.convertToBlobWrite(wacLdpTask.childNameToCreate())
    return (new WriteBlobHandler()).handle(wacLdpTask, storeManager, aud, skipWac, appendOnly)
  }
}
