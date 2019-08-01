import rdf from 'rdf-ext'
import Debug from 'debug'

import { ResourceData, RdfType, canGetQuads, ResourceDataLdpRsNonContainer } from './ResourceDataUtils'
import { rdfToResourceData } from './rdfToResourceData'
import { Quad } from './StoreManager'

const debug = Debug('mergeRdfSources')

async function readAndMerge (rdfSources: { [indexer: string]: ResourceData }): Promise<any> {
  let dataset = rdf.dataset()
  debug('created dataset')
  dataset.forEach((quad: any) => { debug(quad.toString()) })
  for (let i in rdfSources) {
    if (canGetQuads(rdfSources[i])) {
      const quadStream: ReadableStream<Quad> = (rdfSources[i] as ResourceDataLdpRsNonContainer).getQuads()
      await dataset.import(quadStream)
    }
    debug('after import', i)
    dataset.forEach((quad: any) => { debug(quad.toString()) })
    debug('done listing quads', dataset)
  }
  return dataset
}

export async function mergeRdfSources (rdfSources: { [indexer: string]: ResourceData }, rdfType: RdfType) {
  const datasetStream = (await readAndMerge(rdfSources)).toStream()
  return rdfToResourceData(datasetStream, rdfType)
}

export function resourceDataToRdf (resourceData: ResourceData): Promise<any> {
  return readAndMerge({ resourceData })
}
