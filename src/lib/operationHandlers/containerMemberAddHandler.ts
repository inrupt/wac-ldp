
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/RdfLibStoreManager'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { writeBlobHandler } from './writeBlobHandler'
import { ACL } from '../rdf/rdf-constants'

const debug = Debug('container-member-add-handler')

export const containerMemberAddHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerMemberAdd),
  requiredAccessModes: [ ACL.Append ],
  handle: async function executeTask (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // We will convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend

    wacLdpTask.convertToBlobWrite(wacLdpTask.childNameToCreate())
    return writeBlobHandler.handle(wacLdpTask, storeManager, aud, skipWac, appendOnly)
  }
}
