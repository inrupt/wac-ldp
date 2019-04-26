import rdf from 'rdf-ext'
import { ResourceData } from './ResourceDataUtils'
import { rdfToResourceData } from './rdfToResourceData'

function readAndMerge (rdfSources: { [indexer: string]: ResourceData }): ReadableStream {
  const dataset = rdf.dataset()
  // TODO: read and merge rdf sources
  return dataset.toStream()
}

export async function mergeRdfSources (rdfSources: { [indexer: string]: ResourceData }, asJsonLd: boolean) {
  const dataset = readAndMerge(rdfSources)
  return rdfToResourceData(dataset, asJsonLd)
}
