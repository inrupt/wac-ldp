import { readContainer } from '../operations/readContainer'
import { deleteContainer } from '../operations/deleteContainer'

import { readBlob } from '../operations/readBlob'
import { writeBlob } from '../operations/writeBlob'
import { updateBlob } from '../operations/updateBlob'
import { deleteBlob } from '../operations/deleteBlob'

import { unknownOperation } from '../operations/unknownOperation'
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse } from '../api/http/HttpResponder'
import { Container } from '../storage/Container'

type Operation = (wacLdpTask: WacLdpTask, node: Container | Blob, appendOnly: boolean) => Promise<WacLdpResponse>

export function determineOperation (taskType: TaskType): Operation {
  const operations: { [taskType in keyof typeof TaskType]: Operation } = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.containerRead]: readContainer as Operation,
    [TaskType.containerDelete]: deleteContainer as Operation,
    [TaskType.blobRead]: readBlob as unknown as Operation,
    [TaskType.blobWrite]: writeBlob as unknown as Operation,
    [TaskType.blobUpdate]: updateBlob as unknown as Operation,
    [TaskType.blobDelete]: deleteBlob as unknown as Operation,
    [TaskType.unknown]: unknownOperation
  } as unknown as { [taskType in keyof typeof TaskType]: Operation }
  return operations[taskType]
}
