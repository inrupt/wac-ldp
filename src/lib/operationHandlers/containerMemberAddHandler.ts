import { BlobTree, Path, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { writeBlobHandler } from './writeBlobHandler'

const debug = Debug('container-member-add-handler')

export const containerMemberAddHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerMemberAdd),
  handle: async function executeTask (wacLdpTask: WacLdpTask, rdfLayer: RdfLayer, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // We will convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend

    wacLdpTask.convertToBlobWrite(wacLdpTask.childNameToCreate())
    return writeBlobHandler.handle(wacLdpTask, rdfLayer, aud, skipWac, appendOnly)
  }
}
