import Debug from 'debug'
import rdf from 'rdf-ext'
import { Member } from '../storage/Container'
import { rdfToResourceData } from './rdfToResourceData'
import { ResourceData } from './ResourceDataUtils'

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

export async function membersListAsResourceData (containerUrl: string, membersList: Array<Member>, asJsonLd: boolean): Promise<ResourceData> {
  debug('membersListAsResourceData', containerUrl, membersList, asJsonLd)
  const dataset = toRdf(containerUrl, membersList)
  return rdfToResourceData(dataset, asJsonLd)
}
