import uuid from 'uuid/v4'
import { BlobTree, Path } from '../storage/BlobTree'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from './checkAccess'
import { getBlobAndCheckETag } from './getBlobAndCheckETag'
import { determineOperation } from './determineOperation'

import Debug from 'debug'
const debug = Debug('executeTask')

export async function executeTask (wacLdpTask: WacLdpTask, aud: string, storage: BlobTree): Promise<WacLdpResponse> {
  const { webId, appendOnly } = await checkAccess({
    path: wacLdpTask.path,
    isContainer: wacLdpTask.isContainer,
    bearerToken: wacLdpTask.bearerToken,
    aud,
    origin: wacLdpTask.origin,
    wacLdpTaskType: wacLdpTask.wacLdpTaskType,
    storage
  } as AccessCheckTask) // may throw if access is denied

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

  let node: any
  if (wacLdpTask.isContainer) {
    node = storage.getContainer(wacLdpTask.path)
  } else {
    debug('not a container, getting blob and checking etag')
    node = await getBlobAndCheckETag(wacLdpTask, storage)
  }

  const operation = determineOperation(wacLdpTask.wacLdpTaskType)
  const response = await operation.apply(null, [wacLdpTask, node, appendOnly])
  debug('executed', response)
  return response
}
