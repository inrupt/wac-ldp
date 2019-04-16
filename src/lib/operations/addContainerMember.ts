import Debug from 'debug'
import uuid from 'uuid/v4'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'
import { BlobTree } from '../storage/BlobTree'
import { makeResourceData, toStream } from '../../ResourceData'

const debug = Debug('addContainerMember')

export async function addContainerMember (task: LdpTask, storage: BlobTree) {
  debug('LdpParserResult addContainerMember!')
  const resourcePath = task.path + uuid()
  const resource = storage.getBlob(resourcePath)
  await resource.setData(toStream(makeResourceData(task.contentType, task.requestBody)))
  return {
    resultType: ResultType.Created,
    createdLocation: resourcePath
  } as LdpResponse
}
