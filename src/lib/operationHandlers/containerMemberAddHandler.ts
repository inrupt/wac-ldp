import uuid from 'uuid/v4'
import { BlobTree, Path, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'

const debug = Debug('main-handler')

async function getBlobAndCheckETag (wacLdpTask: WacLdpTask, rdfLayer: RdfLayer): Promise<Blob> {
  const blob: Blob = rdfLayer.getLocalBlob(wacLdpTask.fullUrl())
  const data = await blob.getData()
  debug(data, wacLdpTask)
  if (data) { // resource exists
    if (wacLdpTask.ifNoneMatchStar()) { // If-None-Match: * -> resource should not exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const resourceData = await streamToObject(data)
    const ifMatch = wacLdpTask.ifMatch()
    if (ifMatch && resourceData.etag !== ifMatch) { // If-Match -> ETag should match
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const ifNoneMatchList: Array<string> | undefined = wacLdpTask.ifNoneMatchList()
    if (ifNoneMatchList && ifNoneMatchList.indexOf(resourceData.etag) !== -1) { // ETag in blacklist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  } else { // resource does not exist
    if (wacLdpTask.ifMatch()) { // If-Match -> ETag should match so resource should first exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  }
  return blob
}

export const containerMemberAddHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.containerMemberAdd),
  handle: async function executeTask (wacLdpTask: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    // We will convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend
    if (!skipWac) {
      await checkAccess({
        url: wacLdpTask.fullUrl(),
        isContainer: wacLdpTask.isContainer(),
        webId: await wacLdpTask.webId(),
        origin: wacLdpTask.origin(),
        wacLdpTaskType: wacLdpTask.wacLdpTaskType(),
        rdfLayer
      } as AccessCheckTask) // may throw if access is denied
    }

    const childName: string = uuid()
    wacLdpTask.convertToBlobWrite(childName)
    const blob: any = await getBlobAndCheckETag(wacLdpTask, rdfLayer)
    const blobExists: boolean = await blob.exists()
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
    await blob.setData(objectToStream(resourceData))
    return {
      resultType,
      createdLocation: (blobExists ? undefined : wacLdpTask.fullUrl())
    } as WacLdpResponse
  }
}
