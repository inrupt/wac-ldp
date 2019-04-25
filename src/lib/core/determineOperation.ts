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
import { Container } from '../storage/Container'

export function determineOperation (taskType: TaskType): (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse> {
  const operations: { [taskType in keyof typeof TaskType]: (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse> } = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.containerRead]: readContainer as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.containerDelete]: deleteContainer as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.globRead]: readGlob as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.blobRead]: readBlob as unknown as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.blobWrite]: writeBlob as unknown as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.blobUpdate]: updateBlob as unknown as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.blobDelete]: deleteBlob as unknown as (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse>,
    [TaskType.unknown]: unknownOperation
  } as unknown as { [taskType in keyof typeof TaskType]: (wacLdpTask: WacLdpTask, node: Container | Blob) => Promise<WacLdpResponse> }
  return operations[taskType]
}
