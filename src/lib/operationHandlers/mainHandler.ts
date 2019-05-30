import uuid from 'uuid/v4'
import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../core/checkAccess'
import { basicOperations } from '../core/basicOperations'

import Debug from 'debug'

import { streamToObject } from '../rdf/ResourceDataUtils'
import { RdfFetcher } from '../rdf/RdfFetcher'

const debug = Debug('main-handler')

async function getBlobAndCheckETag (wacLdpTask: WacLdpTask, rdfFetcher: RdfFetcher): Promise<Blob> {
  const blob: Blob = rdfFetcher.getLocalBlob(wacLdpTask.fullUrl())
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

async function determineAppendOnly (wacLdpTask: WacLdpTask, rdfFetcher: RdfFetcher, skipWac: boolean): Promise<boolean> {
  let appendOnly = false
  if (skipWac) {
    return false
  }
  return checkAccess({
    url: wacLdpTask.fullUrl(),
    isContainer: wacLdpTask.isContainer(),
    webId: await wacLdpTask.webId(),
    origin: wacLdpTask.origin(),
    wacLdpTaskType: wacLdpTask.wacLdpTaskType(),
    rdfFetcher
  } as AccessCheckTask) // may throw if access is denied
  return false
}

async function handleOperation (wacLdpTask: WacLdpTask, rdfFetcher: RdfFetcher, appendOnly: boolean) {
  let node: any
  if (wacLdpTask.isContainer()) {
    node = rdfFetcher.getLocalContainer(wacLdpTask.fullUrl())
  } else {
    debug('not a container, getting blob and checking etag')
    node = await getBlobAndCheckETag(wacLdpTask, rdfFetcher)
  }

  const operation = basicOperations(wacLdpTask.wacLdpTaskType())

  // Note that the operation is executed on the `node` that was retrieved earlier,
  // that means that the storage can tell if the underlying resource changed since
  // that memento of the node was retrieved, and reject write operations if that's
  // the case. Also, if there was for instance an ETag check on a read operation,
  // then the body will be the one from the memento that existed when the resource
  // reference was first retrieved.
  // But see also https://github.com/inrupt/wac-ldp/issues/46

  const response = await operation.apply(null, [wacLdpTask, node, appendOnly])
  debug('executed', response)
  return response
}

export const mainHandler = {
  canHandle: () => true,
  handle: async function executeTask (wacLdpTask: WacLdpTask, aud: string, rdfFetcher: RdfFetcher, skipWac: boolean): Promise<WacLdpResponse> {

    // may throw if access is denied:
    const appendOnly = await determineAppendOnly(wacLdpTask, rdfFetcher, skipWac)

    // all other operations:
    return handleOperation(wacLdpTask, rdfFetcher, appendOnly)
  }
}
