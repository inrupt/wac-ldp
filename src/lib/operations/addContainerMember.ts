import Debug from 'debug'
import uuid from 'uuid/v4'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'
import { makeResourceData, toStream } from '../../ResourceData'

const debug = Debug('addContainerMember')

export async function addContainerMember (task: WacLdpTask, storage: BlobTree) {
  debug('operation addContainerMember!')
  const blobPath = task.path + uuid()
  const blob = storage.getBlob(blobPath)
  await blob.setData(toStream(makeResourceData(task.contentType, task.requestBody)))
  return {
    resultType: ResultType.Created,
    createdLocation: blobPath
  } as WacLdpResponse
}
