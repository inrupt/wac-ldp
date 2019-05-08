import rdf from 'rdf-ext'
import Debug from 'debug'
import { Store, DataFactory } from 'n3'
import { newEngine } from '@comunica/actor-init-sparql-rdfjs'
import { streamToBuffer } from './ResourceDataUtils'

const debug = Debug('apply-query')

export async function applyQuery (dataset: any, sparqlQuery: string): Promise<string> {
  const store = new Store()
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')))
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')))

  const myEngine = newEngine()
  const result = await myEngine.query(sparqlQuery, {
    sources: [
      {
        type: 'rdfjsSource',
        value: store
      }
    ]
  })
  const sparqlResultJson = await myEngine.resultToString(result, 'application/json')
  debug('sparql result json object', sparqlResultJson)
  const buffer = await streamToBuffer(sparqlResultJson.data)
  debug('sparql result json', buffer.toString())
  return buffer.toString()
}
