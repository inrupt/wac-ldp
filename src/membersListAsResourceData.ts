import * as Stream from 'stream'
import Debug from 'debug'
import { makeResourceData, ResourceData } from './ResourceData'
import Formats from 'rdf-formats-common'
import rdf from 'rdf-ext'

const formats = Formats()
const debug = Debug('membersListAsResourceData')

function toRdf (containerUrl: string, fileNames: Array<string>): ReadableStream {
  const dataset = new rdf.dataset()
  fileNames.map(fileName => {
    dataset.add(rdf.quad(
      rdf.namedNode(containerUrl),
      rdf.namedNode('http://www.w3.org/ns/ldp#contains'),
      rdf.namedNode(containerUrl + fileName)))
  })
  return dataset.toStream()
}

function toFormat (containerUrl: string, fileNames: Array<string>, contentType: string): Promise<string> {
  const serializerJsonLd = formats.serializers[ contentType ]
  const input = toRdf(containerUrl, fileNames)
  const output = serializerJsonLd.import(input)
  return new Promise(resolve => {
    let str = ''
    output.on('data', chunk => {
      debug('chunk', chunk)
      str += chunk.toString()
    })
    output.on('end', () => {
      resolve(str)
    })
  })
}

export default async function membersListAsResourceData (containerUrl, fileNames, asJsonLd): Promise<ResourceData> {
  debug('membersListAsResourceData', containerUrl, fileNames, asJsonLd)
  const contentType = (asJsonLd ? 'application/ld+json' : 'text/turtle')
  return makeResourceData(contentType, await toFormat(containerUrl, fileNames, contentType))
}
