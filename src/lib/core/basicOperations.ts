import Debug from 'debug'
import { membersListAsResourceData } from '../rdf/membersListAsResourceData'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType, ErrorResult } from '../api/http/HttpResponder'
import { Container, Member } from '../storage/Container'
import { Blob } from '../storage/Blob'
import { resourceDataToRdf } from '../rdf/mergeRdfSources'
import { streamToObject, objectToStream, makeResourceData, ResourceData } from '../rdf/ResourceDataUtils'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { applyQuery } from '../rdf/applyQuery'
import { applyPatch } from '../rdf/applyPatch'

export type Operation = (wacLdpTask: WacLdpTask, node: Container | Blob, appendOnly: boolean) => Promise<WacLdpResponse>

const debug = Debug('Basic Operations')

async function writeBlob (task: WacLdpTask, blob: Blob) {
  const blobExists: boolean = await blob.exists()
  debug('operation writeBlob!', blobExists)
  const resultType = (blobExists ? ResultType.OkayWithoutBody : ResultType.Created)
  const contentType: string | undefined = task.contentType()
  const resourceData = makeResourceData(contentType ? contentType : '', await task.requestBody())
  await blob.setData(objectToStream(resourceData))
  return {
    resultType,
    createdLocation: (blobExists ? undefined : task.fullUrl())
  } as WacLdpResponse
}

async function updateBlob (task: WacLdpTask, blob: Blob, appendOnly: boolean): Promise<WacLdpResponse> {
  debug('operation updateBlob!', { appendOnly, blob })
  const resourceData = await streamToObject(await blob.getData()) as ResourceData
  const turtleDoc: string = await applyPatch(resourceData, await task.requestBody() || '', task.fullUrl(), appendOnly)
  await blob.setData(await objectToStream(makeResourceData(resourceData.contentType, turtleDoc)))
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}

async function deleteBlob (task: WacLdpTask, blob: Blob): Promise<WacLdpResponse> {
  debug('operation deleteBlob!')
  await blob.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}

async function unknownOperation (): Promise<WacLdpResponse> {
  debug('operation unknownOperation!')
  throw new ErrorResult(ResultType.MethodNotAllowed)
}

export function basicOperations (taskType: TaskType): Operation {
  const operations: { [taskType in keyof typeof TaskType]: Operation } = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.blobWrite]: writeBlob as unknown as Operation,
    [TaskType.blobUpdate]: updateBlob as unknown as Operation,
    [TaskType.blobDelete]: deleteBlob as unknown as Operation,
    [TaskType.unknown]: unknownOperation
  } as unknown as { [taskType in keyof typeof TaskType]: Operation }
  return operations[taskType]
}
