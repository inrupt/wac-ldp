import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask, determineRequiredAccessModes } from '../core/checkAccess'

import Debug from 'debug'

import { streamToObject, makeResourceData } from '../rdf/ResourceDataUtils'
import { RdfLayer } from '../rdf/RdfLayer'
import { resourceDataToRdf } from '../rdf/mergeRdfSources'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { applyQuery } from '../rdf/applyQuery'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'

const debug = Debug('read-blob-handler')

export const readBlobHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => (wacLdpTask.wacLdpTaskType() === TaskType.blobRead),
  handle: async function (task: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    if (!skipWac) {
      const webId = await task.webId()
      debug('webId in readBlobHandler is', webId)
      await checkAccess({
        url: task.fullUrl(),
        webId,
        origin: await task.origin(),
        requiredAccessModes: determineRequiredAccessModes(task.wacLdpTaskType()),
        rdfLayer
      } as AccessCheckTask) // may throw if access is denied
    }
    const resourceData = await getResourceDataAndCheckETag(task, rdfLayer)
    debug('operation readBlob!', task.rdfType())
    let result = {
    } as any
    const exists = !!resourceData
    if (!exists) {
      result.resultType = ResultType.NotFound
      return result
    }
    result.resourceData = resourceData
    // only convert if requested rdf type is not the one that was stored
    if (!task.rdfTypeMatches(result.resourceData.contentType)) {
      const rdf = await resourceDataToRdf(result.resourceData)
      result.resourceData = await rdfToResourceData(rdf, task.rdfType())
    }
    const sparqlQuery: string | undefined = task.sparqlQuery()
    if (sparqlQuery) {
      debug('reading blob as rdf', result.resourceData)
      const rdf = await resourceDataToRdf(result.resourceData)
      rdf.forEach((quad: any) => { debug('quad', quad.toString()) })
      debug('done here printing quads')
      debug('applying query', task.sparqlQuery())
      const body: string = await applyQuery(rdf, sparqlQuery)
      debug('converting to requested representation', rdf)
      result.resourceData = makeResourceData('application/sparql+json', body)
    }
    debug('result.resourceData set to ', result.resourceData)
    if (task.omitBody()) {
      result.resultType = ResultType.OkayWithoutBody
    } else {
      result.resultType = ResultType.OkayWithBody
    }
    return result as WacLdpResponse
  }
}
