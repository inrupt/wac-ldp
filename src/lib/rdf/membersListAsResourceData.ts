import Debug from 'debug'
import rdf from 'rdf-ext'
import { Member } from '../storage/Container'
import { rdfToResourceData } from './rdfToResourceData'
import { ResourceData } from './ResourceDataUtils'
import { LDP, RDF } from './rdf-constants'

const debug = Debug('membersListAsResourceData')

function toRdf (containerUrl: URL, membersList: Array<Member>): ReadableStream {
  const dataset = rdf.dataset()
  membersList.map(member => {
    dataset.add(rdf.quad(
      rdf.namedNode(''),
      rdf.namedNode(LDP.contains.toString()),
      rdf.namedNode(containerUrl.toString() + member.name)))
  })
  debug('setting container type', LDP, RDF)
  dataset.add(rdf.quad(
    rdf.namedNode(''),
    rdf.namedNode(RDF.type.toString()),
    rdf.namedNode(LDP.BasicContainer.toString())
  ))
  dataset.add(rdf.quad(
    rdf.namedNode(''),
    rdf.namedNode(RDF.type.toString()),
    rdf.namedNode(LDP.Container.toString())
  ))
  dataset.add(rdf.quad(
    rdf.namedNode(''),
    rdf.namedNode(RDF.type.toString()),
    rdf.namedNode(LDP.RDFSource.toString())
  ))
  debug(dataset)
  return dataset.toStream()
}

export async function membersListAsResourceData (containerUrl: URL, membersList: Array<Member>, asJsonLd: boolean): Promise<ResourceData> {
  debug('membersListAsResourceData', containerUrl, membersList, asJsonLd)
  const dataset = toRdf(containerUrl, membersList)
  return rdfToResourceData(dataset, asJsonLd)
}
