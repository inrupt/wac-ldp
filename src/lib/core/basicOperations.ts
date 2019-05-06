import * as rdflib from 'rdflib'

import Debug from 'debug'
import { membersListAsResourceData } from '../rdf/membersListAsResourceData'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType, ErrorResult } from '../api/http/HttpResponder'
import { Container } from '../storage/Container'
import { Blob } from '../storage/Blob'
import { resourceDataToRdf } from '../rdf/mergeRdfSources'
import { streamToObject, objectToStream, makeResourceData, ResourceData } from '../rdf/ResourceDataUtils'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { applyQuery } from '../rdf/applyQuery'

export type Operation = (wacLdpTask: WacLdpTask, node: Container | Blob, appendOnly: boolean) => Promise<WacLdpResponse>

const debug = Debug('Basic Operations')

async function readContainer (task: WacLdpTask, container: Container): Promise<WacLdpResponse> {
  debug('operation readContainer!')
  debug(container)
  const membersList = await container.getMembers()
  debug(membersList)
  const resourceData = await membersListAsResourceData(task.fullUrl, membersList, task.asJsonLd)
  debug(resourceData)
  return {
    resultType: (task.omitBody ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
    resourceData,
    isContainer: true
  } as WacLdpResponse
}

async function deleteContainer (task: WacLdpTask, container: Container) {
  debug('operation deleteContainer!')
  await container.delete()
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}

async function readBlob (task: WacLdpTask, blob: Blob): Promise<WacLdpResponse> {
  debug('operation readBlob!', task.asJsonLd)
  let result = {
  } as any
  const exists = await blob.exists()
  if (!exists) {
    result.resultType = ResultType.NotFound
    return result
  }
  result.resourceData = await streamToObject(await blob.getData())
  if (task.asJsonLd) {
    const rdf = resourceDataToRdf(result.resourceData)
    result.resourceData = await rdfToResourceData(rdf, true)
  }
  if (task.sparqlQuery) {
    debug('reading blob as rdf')
    const rdf = resourceDataToRdf(result.resourceData)
    debug('applying query', task.sparqlQuery)
    await applyQuery(rdf, task.sparqlQuery)
    debug('converting to requested representation')
    result.resourceData = await rdfToResourceData(rdf, task.asJsonLd)
  }
  debug('result.resourceData set to ', result.resourceData)
  if (task.omitBody) {
    result.resultType = ResultType.OkayWithoutBody
  } else {
    result.resultType = ResultType.OkayWithBody
  }
  return result as WacLdpResponse
}

async function writeBlob (task: WacLdpTask, blob: Blob) {
  const blobExists: boolean = await blob.exists()
  debug('operation writeBlob!', blobExists)
  const resultType = (blobExists ? ResultType.OkayWithoutBody : ResultType.Created)
  const resourceData = makeResourceData(task.contentType ? task.contentType : '', task.requestBody ? task.requestBody : '')
  await blob.setData(objectToStream(resourceData))
  return {
    resultType,
    createdLocation: (blobExists ? undefined : task.fullUrl)
  } as WacLdpResponse
}

async function updateBlob (task: WacLdpTask, blob: Blob, appendOnly: boolean): Promise<WacLdpResponse> {
  debug('operation updateBlob!', { appendOnly })
  const resourceData = await streamToObject(await blob.getData()) as ResourceData
  const store = rdflib.graph()
  const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
  parse(resourceData.body, store, task.fullUrl, resourceData.contentType)
  debug('before patch', store.toNT())

  const sparqlUpdateParser = rdflib.sparqlUpdateParser as unknown as (patch: string, store: any, url: string) => any
  const patchObject = sparqlUpdateParser(task.requestBody || '', rdflib.graph(), task.fullUrl)
  debug('patchObject', patchObject)
  if (appendOnly && typeof patchObject.delete !== 'undefined') {
    debug('appendOnly and patch contains deletes')
    throw new ErrorResult(ResultType.AccessDenied)
  }
  await new Promise((resolve, reject) => {
    store.applyPatch(patchObject, store.sym(task.fullUrl), (err: Error) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
  debug('after patch', store.toNT())
  const turtleDoc = rdflib.serialize(undefined, store, task.fullUrl, 'text/turtle')
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
