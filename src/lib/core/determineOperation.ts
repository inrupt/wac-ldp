import { readContainer } from '../operations/readContainer'
import { deleteContainer } from '../operations/deleteContainer'

import { readGlob } from '../operations/readGlob'

import { readBlob } from '../operations/readBlob'
import { writeBlob } from '../operations/writeBlob'
import { updateBlob } from '../operations/updateBlob'
import { deleteBlob } from '../operations/deleteBlob'

import { unknownOperation } from '../operations/unknownOperation'
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse } from '../api/http/HttpResponder'

export function determineOperation (taskType): (WacLdpTask, Node) => Promise<WacLdpResponse> {
  const operations = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.containerRead]: readContainer,
    [TaskType.containerDelete]: deleteContainer,
    [TaskType.globRead]: readGlob,
    [TaskType.blobRead]: readBlob,
    [TaskType.blobWrite]: writeBlob,
    [TaskType.blobUpdate]: updateBlob,
    [TaskType.blobDelete]: deleteBlob,
    [TaskType.unknown]: unknownOperation
  }
  return operations[taskType]
}
