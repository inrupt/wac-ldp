import * as Stream from 'stream'
import Debug from 'debug'
import { makeResourceData, ResourceData } from './ResourceDataUtils'
import Formats from 'rdf-formats-common'
import rdf from 'rdf-ext'
import { Member } from '../storage/Container'

const formats = Formats()
const debug = Debug('membersListAsResourceData')

function toRdf (containerUrl: string, membersList: Array<Member>): ReadableStream {
  const dataset = rdf.dataset()
  membersList.map(member => {
    dataset.add(rdf.quad(
      rdf.namedNode(containerUrl),
      rdf.namedNode('http://www.w3.org/ns/ldp#contains'),
      rdf.namedNode(containerUrl + member.name)))
  })
  return dataset.toStream()
}

function toFormat (containerUrl: string, membersList: Array<Member>, contentType: string): Promise<string> {
  const serializerJsonLd = formats.serializers[ contentType ]
  const input = toRdf(containerUrl, membersList)
  const output = serializerJsonLd.import(input)
  return new Promise(resolve => {
    let str = ''
    output.on('data', (chunk: Buffer) => {
      debug('chunk', chunk)
      str += chunk.toString()
    })
    output.on('end', () => {
      resolve(str)
    })
  })
}

export async function membersListAsResourceData (containerUrl: string, membersList: Array<Member>, asJsonLd: boolean): Promise<ResourceData> {
  debug('membersListAsResourceData', containerUrl, membersList, asJsonLd)
  const contentType = (asJsonLd ? 'application/ld+json' : 'text/turtle')
  return makeResourceData(contentType, await toFormat(containerUrl, membersList, contentType))
}
