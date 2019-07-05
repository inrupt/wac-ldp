import { BlobTree, Path, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'

const debug = Debug('main-handler')

export const containerMemberAddHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerMemberAdd),
  handle: async function executeTask (wacLdpTask: WacLdpTask, rdfLayer: RdfLayer, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // We will convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend

    wacLdpTask.convertToBlobWrite(wacLdpTask.childNameToCreate())
    const resourceDataBefore = await getResourceDataAndCheckETag(wacLdpTask, rdfLayer)
    const blobExists: boolean = !!resourceDataBefore
    debug('Writing Blob!', blobExists)
    const resultType = (blobExists ? ResultType.OkayWithoutBody : ResultType.Created)
    const contentType: string | undefined = wacLdpTask.contentType()
    const resourceData = makeResourceData(contentType ? contentType : '', await wacLdpTask.requestBody())

    // Note that the operation is executed on the `node` that was retrieved earlier,
    // that means that the storage can tell if the underlying resource changed since
    // that memento of the node was retrieved, and reject write operations if that's
    // the case. Also, if there was for instance an ETag check on a read operation,
    // then the body will be the one from the memento that existed when the resource
    // reference was first retrieved.
    // But see also https://github.com/inrupt/wac-ldp/issues/46
    await rdfLayer.setData(wacLdpTask.fullUrl(), objectToStream(resourceData))
    return {
      resultType,
      createdLocation: (blobExists ? undefined : wacLdpTask.fullUrl()),
      resourcesChanged: [ wacLdpTask.fullUrl() ]
    } as WacLdpResponse
  }
}
