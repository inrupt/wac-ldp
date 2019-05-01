import Debug from 'debug'
import { WacLdpResponse, ResultType, ErrorResult } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'
import * as rdflib from 'rdflib'

import { streamToObject, ResourceData, objectToStream, makeResourceData } from '../util/ResourceDataUtils'

const debug = Debug('updateBlob')

export async function updateBlob (task: WacLdpTask, blob: Blob, appendOnly: boolean): Promise<WacLdpResponse> {
  debug('operation updateBlob!')
  const resourceData = await streamToObject(await blob.getData()) as ResourceData
  const store = rdflib.graph()
  const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
  parse(resourceData.body, store, task.fullUrl, resourceData.contentType)
  debug('before patch', store.toNT())

  const sparqlUpdateParser = rdflib.sparqlUpdateParser as unknown as (patch: string, store: any, url: string) => any
  const patchObject = sparqlUpdateParser(task.requestBody || '', rdflib.graph(), task.fullUrl)
  store.applyPatch(patchObject, store.sym(task.fullUrl), (err: Error) => {
    console.error(err)
  })
  debug('after patch', store.toNT())
  await blob.setData(await objectToStream(makeResourceData(resourceData.contentType, store.toNT())))
  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
