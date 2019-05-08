async function test() {
  const newEngine = require('@comunica/actor-init-sparql-rdfjs').newEngine;
  const N3Store = require('n3').Store;
  const DataFactory = require('n3').DataFactory;

  // This can be any RDFJS source
  // In this example, we wrap an N3Store
  const store = new N3Store();
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')));
  store.addQuad(DataFactory.quad(
    DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')));

  // Create our engine, and query it.
  // If you intend to query multiple times, be sure to cache your engine for optimal performance.
  const myEngine = newEngine();
  const result = await myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
    { sources: [ { type: 'rdfjsSource', value: store } ] });
  result.bindingsStream.on('data', (data) => {
    console.log(data);
  });
}
test()
