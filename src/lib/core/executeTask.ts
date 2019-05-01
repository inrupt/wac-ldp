import uuid from 'uuid/v4'
import { BlobTree, Path } from '../storage/BlobTree'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from './checkAccess'
import { getBlobAndCheckETag } from './getBlobAndCheckETag'
import { determineOperation } from './determineOperation'

import Debug from 'debug'
import { readContainer } from '../operations/readContainer'
import { ResourceData, streamToObject } from '../util/ResourceDataUtils'
import { determineWebId } from '../auth/determineWebId'
import { mergeRdfSources } from '../util/mergeRdfSources'
const debug = Debug('executeTask')

export async function executeTask (wacLdpTask: WacLdpTask, aud: string, storage: BlobTree, skipWac: boolean): Promise<WacLdpResponse> {
  const webId = (wacLdpTask.bearerToken ? await determineWebId(wacLdpTask.bearerToken, aud) : undefined)
  debug('webId', webId)
  debug({
    path: wacLdpTask.path,
    isContainer: wacLdpTask.isContainer,
    webId,
    origin: wacLdpTask.origin,
    wacLdpTaskType: wacLdpTask.wacLdpTaskType })

  // handle OPTIONS before checking WAC
  if (wacLdpTask.wacLdpTaskType === TaskType.getOptions) {
    return Promise.resolve({
      resultType: ResultType.OkayWithoutBody,
      resourceData: undefined,
      createdLocation: undefined,
      isContainer: wacLdpTask.isContainer
    })
  }

  let appendOnly = false
  if (!skipWac) {
    appendOnly = await checkAccess({
      path: wacLdpTask.path,
      isContainer: wacLdpTask.isContainer,
      webId,
      origin: wacLdpTask.origin,
      wacLdpTaskType: wacLdpTask.wacLdpTaskType,
      storage
    } as AccessCheckTask) // may throw if access is denied
  }

  // convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
  // but notice that access check for this is append on the container,
  // write access on the Blob is not required!
  // See https://github.com/solid/web-access-control-spec#aclappend
  if (wacLdpTask.wacLdpTaskType === TaskType.containerMemberAdd) {
    debug('converting', wacLdpTask)
    wacLdpTask.path = wacLdpTask.path.toChild(uuid())
    wacLdpTask.wacLdpTaskType = TaskType.blobWrite
    wacLdpTask.isContainer = false
    debug('converted', wacLdpTask)
  }

  // For TaskType.globRead, at this point will have checked read access over the
  // container, but need to collect all RDF sources, filter on access, and then
  // concatenate them.
  if (wacLdpTask.wacLdpTaskType === TaskType.globRead) {
    const containerMembers = await storage.getContainer(wacLdpTask.path).getMembers()
    const rdfSources: { [indexer: string]: ResourceData } = {}
    await Promise.all(containerMembers.map(async (member) => {
      debug('glob, considering member', member)
      if (member.isContainer) {// not an RDF source
        return
      }
      const blobPath = wacLdpTask.path.toChild(member.name)
      const data = await storage.getBlob(blobPath).getData()
      const resourceData = await streamToObject(data)
      if (['text/turtle', 'application/ld+json'].indexOf(resourceData.contentType) === -1) { // not an RDF source
        return
      }
      try {
        if (!skipWac) {
          await checkAccess({
            path: blobPath,
            isContainer: false,
            webId,
            origin: wacLdpTask.origin,
            wacLdpTaskType: TaskType.blobRead,
            storage
          } as AccessCheckTask) // may throw if access is denied
        }
        rdfSources[member.name] = resourceData
        debug('Found RDF source', member.name)
      } catch (error) {
        if (error instanceof ErrorResult && error.resultType === ResultType.AccessDenied) {
          debug('access denied to blob in glob, skipping', blobPath.toString())
        } else {
          debug('unexpected error for blob in glob, skipping', error.message, blobPath.toString())
        }
      }
    }))

    return {
      resultType: (wacLdpTask.omitBody ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData: await mergeRdfSources(rdfSources, wacLdpTask.asJsonLd),
      createdLocation: undefined,
      isContainer: true
    } as WacLdpResponse
  }

  let node: any
  if (wacLdpTask.isContainer) {
    node = storage.getContainer(wacLdpTask.path)
  } else {
    debug('not a container, getting blob and checking etag')
    node = await getBlobAndCheckETag(wacLdpTask, storage)
  }

  const operation = determineOperation(wacLdpTask.wacLdpTaskType)

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
