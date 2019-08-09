import Debug from 'debug'
import rdf from 'rdf-ext'
import { Child } from './BufferTree'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { ResourceData, RdfType } from '../rdf/ResourceDataUtils'
import { LDP, RDF } from '../rdf/rdf-constants'

const debug = Debug('membersListAsResourceData')

export function membersListAsQuadStream (containerUrl: URL, membersList: Array<Child>): ReadableStream {
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

export async function membersListAsResourceData (containerUrl: URL, membersList: Array<Child>, rdfType: RdfType): Promise<ResourceData> {
  debug('membersListAsResourceData', containerUrl, membersList, rdfType)
  const dataset = membersListAsQuadStream(containerUrl, membersList)
  return rdfToResourceData(dataset, rdfType)
}
