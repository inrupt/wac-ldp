import * as Stream from 'stream'
import Debug from 'debug'
import { makeResourceData, ResourceData } from './ResourceDataUtils'
import Formats from 'rdf-formats-common'
import rdf from 'rdf-ext'
import { Member } from '../storage/Container'

const formats = Formats()
const debug = Debug('membersListAsResourceData')

function toFormat (input: ReadableStream, contentType: string): Promise<string> {
  const serializer = formats.serializers[ contentType ]
  const output = serializer.import(input)
  return new Promise(resolve => {
    let str = ''
    output.on('data', (chunk: Buffer) => {
      debug('chunk', chunk.toString())
      str += chunk.toString()
    })
    output.on('end', () => {
      resolve(str)
    })
  })
}

export async function rdfToResourceData (dataset: ReadableStream, asJsonLd: boolean): Promise<ResourceData> {
  const contentType = (asJsonLd ? 'application/ld+json' : 'text/turtle')
  const str = await toFormat(dataset, contentType)
  return makeResourceData(contentType, str)
}
