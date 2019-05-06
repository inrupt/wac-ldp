import Debug from 'debug'
import rdf from 'rdf-ext'
import { Member } from '../storage/Container'
import { rdfToResourceData } from './rdfToResourceData'
import { ResourceData } from './ResourceDataUtils'
import { LDP } from './rdf-constants'

const debug = Debug('membersListAsResourceData')

function toRdf (containerUrl: string, membersList: Array<Member>): ReadableStream {
  const dataset = rdf.dataset()
  membersList.map(member => {
    dataset.add(rdf.quad(
      rdf.namedNode(containerUrl),
      rdf.namedNode(LDP.contains),
      rdf.namedNode(containerUrl + member.name)))
  })
  return dataset.toStream()
}

export async function membersListAsResourceData (containerUrl: string, membersList: Array<Member>, asJsonLd: boolean): Promise<ResourceData> {
  debug('membersListAsResourceData', containerUrl, membersList, asJsonLd)
  const dataset = toRdf(containerUrl, membersList)
  return rdfToResourceData(dataset, asJsonLd)
}
