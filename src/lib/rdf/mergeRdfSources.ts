import rdf from 'rdf-ext'
import Debug from 'debug'
import convert from 'buffer-to-stream'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'

import { ResourceData, RdfType } from './ResourceDataUtils'
import { rdfToResourceData } from './rdfToResourceData'

const debug = Debug('mergeRdfSources')

function readAndMerge (rdfSources: { [indexer: string]: ResourceData }): ReadableStream {
  const dataset = rdf.dataset()
  debug('created dataset')
  dataset.forEach((quad: any) => { debug(quad.toString()) })
  for (let i in rdfSources) {
    let parser
    if (rdfSources[i].rdfType === RdfType.JsonLd) {
      parser = new JsonLdParser({ factory: rdf })
    } else if (rdfSources[i].rdfType === RdfType.Turtle) {
      parser = new N3Parser({ factory: rdf })
    }
    if (!parser) {
      continue
    }
    const bodyStream = convert(Buffer.from(rdfSources[i].body))
    const quadStream = parser.import(bodyStream)
    dataset.import(quadStream)
    debug('after import', rdfSources[i].body)
    dataset.forEach((quad: any) => { debug(quad.toString()) })
  }
  return dataset.toStream()
}

export async function mergeRdfSources (rdfSources: { [indexer: string]: ResourceData }, asJsonLd: boolean) {
  const dataset = readAndMerge(rdfSources)
  return rdfToResourceData(dataset, asJsonLd)
}

export function resourceDataToRdf (resourceData: ResourceData) {
  return readAndMerge({ resourceData })
}
