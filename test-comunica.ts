import { newEngine } from '@comunica/actor-init-sparql-rdfjs'
import { Store, DataFactory } from 'n3'

async function test () {
  // This can be any RDFJS source
  // In this example, we wrap an N3Store
  const store = new Store()
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')))
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')))

  // Create our engine, and query it.
  // If you intend to query multiple times, be sure to cache your engine for optimal performance.
  const myEngine = newEngine()
  const result: any = await myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
    { sources: [ { type: 'rdfjsSource', value: store } ] })
  result.bindingsStream.on('data', (data: any) => {
    console.log(data)
  })
}
void test()
