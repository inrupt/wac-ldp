import rdf from 'rdf-ext'
import Debug from 'debug'
import { Store, DataFactory } from 'n3'
import { newEngine } from '@comunica/actor-init-sparql-rdfjs'
import { streamToBuffer } from './ResourceDataUtils'
import { Binding } from '@babel/traverse';

const debug = Debug('apply-query')

export async function applyQuery (dataset: any, sparqlQuery: string): Promise<string> {
  const store = new Store()
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')))
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')))
  const myEngine = newEngine()
  const result: any = await myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
    { sources: [ { type: 'rdfjsSource', value: store } ] })
  dataset.forEach((quad: any) => { debug('quad', quad.toString()) })
  debug('done printing quads')
  // const store = new Store()
  // store.addQuad(DataFactory.quad(
  //   DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')))
  // store.addQuad(DataFactory.quad(
  //   DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')))

  // const myEngine = newEngine()
  // const result: any = await myEngine.query(sparqlQuery, {
  //   sources: [
  //     {
  //       type: 'rdfjsSource',
  //       value: dataset
  //     }
  //   ]
  // })
  debug('query result', result)
  const bindings: Array<any> = []
  await new Promise((resolve) => {
    result.bindingsStream.on('end', resolve)
    result.bindingsStream.on('data', (data: any) => {
          // Each data object contains a mapping from variables to RDFJS terms.
      debug(data.get('?s'))
      debug(data.get('?p'))
      debug(data.get('?o'))
      let binding: { [indexer: string]: string } = {}
      for (let i of data) {
        debug(i)
        binding[i[0]] = i[1].value
      }
      bindings.push(binding)
      // binding.push(binding)
    })
  })
  // debug('done printing bindings')
  // const sparqlResultJson = await myEngine.resultToString(result, 'application/json')
  // debug('sparql result json object', sparqlResultJson)
  // const buffer = await streamToBuffer(sparqlResultJson.data)
  // debug('sparql result json', buffer.toString())
  // return buffer.toString()
  return JSON.stringify({
    head: {
      vars: [ result.variables ]
    },
    results: {
      ordered: false,
      distinct: false,
      bindings
    }
  })
}
