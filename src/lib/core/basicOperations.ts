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

async function unknownOperation (): Promise<WacLdpResponse> {
  debug('operation unknownOperation!')
  throw new ErrorResult(ResultType.MethodNotAllowed)
}

export function basicOperations (taskType: TaskType): Operation {
  const operations: { [taskType in keyof typeof TaskType]: Operation } = {
    // input type: LdpTask, BlobTree
    // output type: LdpResponse
    [TaskType.unknown]: unknownOperation
  } as unknown as { [taskType in keyof typeof TaskType]: Operation }
  return operations[taskType]
}
