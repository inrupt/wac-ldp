import uuid from 'uuid/v4'
import { BlobTree, Path, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../core/checkAccess'
import { basicOperations } from '../core/basicOperations'

import Debug from 'debug'

import { ResourceData, streamToObject } from '../rdf/ResourceDataUtils'
import { determineWebId } from '../auth/determineWebId'
import { mergeRdfSources } from '../rdf/mergeRdfSources'
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

async function handleGlobRead (wacLdpTask: WacLdpTask, rdfFetcher: RdfFetcher, skipWac: boolean) {
  const containerMembers = await rdfFetcher.getLocalContainer(wacLdpTask.fullUrl()).getMembers()
  const webId = await wacLdpTask.webId()
  const rdfSources: { [indexer: string]: ResourceData } = {}
  await Promise.all(containerMembers.map(async (member) => {
    debug('glob, considering member', member)
    if (member.isContainer) {// not an RDF source
      return
    }
    const blobUrl = new URL(member.name, wacLdpTask.fullUrl())
    const data = await rdfFetcher.getLocalBlob(blobUrl).getData()
    const resourceData = await streamToObject(data)
    if (['text/turtle', 'application/ld+json'].indexOf(resourceData.contentType) === -1) { // not an RDF source
      return
    }
    try {
      if (!skipWac) {
        await checkAccess({
          url: blobUrl,
          isContainer: false,
          webId,
          origin: wacLdpTask.origin(),
          wacLdpTaskType: TaskType.blobRead,
          rdfFetcher
        } as AccessCheckTask) // may throw if access is denied
      }
      rdfSources[member.name] = resourceData
      debug('Found RDF source', member.name)
    } catch (error) {
      if (error instanceof ErrorResult && error.resultType === ResultType.AccessDenied) {
        debug('access denied to blob in glob, skipping', blobUrl.toString())
      } else {
        debug('unexpected error for blob in glob, skipping', error.message, blobUrl.toString())
      }
    }
  }))

  return {
    resultType: (wacLdpTask.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
    resourceData: await mergeRdfSources(rdfSources, wacLdpTask.asJsonLd()),
    createdLocation: undefined,
    isContainer: true
  } as WacLdpResponse
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

    // convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend
    if (wacLdpTask.wacLdpTaskType() === TaskType.containerMemberAdd) {
      const childName: string = uuid()
      wacLdpTask.convertToBlobWrite(childName)
    }

    // For TaskType.globRead, at this point will have checked read access over the
    // container, but need to collect all RDF sources, filter on access, and then
    // concatenate them.
    if (wacLdpTask.wacLdpTaskType() === TaskType.globRead) {
      return handleGlobRead(wacLdpTask, rdfFetcher, skipWac)
    }

    // all other operations:
    return handleOperation(wacLdpTask, rdfFetcher, appendOnly)
  }
}
