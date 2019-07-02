import * as Stream from 'stream'
import Debug from 'debug'
import { makeResourceData, ResourceData, RdfType } from './ResourceDataUtils'
import Formats from 'rdf-formats-common'
import rdf from 'rdf-ext'
import { Member } from '../storage/Container'

const formats = Formats()
const debug = Debug('rdfToResourceData')

function toFormat (input: ReadableStream, rdfType: RdfType): Promise<{ body: string, contentType: string }> {
  let contentType: string
  switch (rdfType) {
    case RdfType.JsonLd:
      contentType = 'application/ld+json'
      break
    default:
      contentType = 'text/turtle'
  }
  const serializer = formats.serializers[ contentType ]
  const output = serializer.import(input)
  return new Promise(resolve => {
    let str = ''
    output.on('data', (chunk: Buffer) => {
      debug('chunk', chunk.toString())
      str += chunk.toString()
    })
    output.on('end', () => {
      resolve({ body: str, contentType })
    })
  })
}

export async function rdfToResourceData (dataset: ReadableStream, rdfType: RdfType): Promise<ResourceData> {
  const { body, contentType } = await toFormat(dataset, rdfType)
  return makeResourceData(contentType, body)
}
