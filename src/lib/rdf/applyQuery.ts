import rdf from 'rdf-ext'
import Debug from 'debug'
import { newEngine } from '@comunica/actor-init-sparql-rdfjs'
import { Store } from 'n3'
const debug = Debug('apply-query')

function removeLeadingQuestionMark (str: string) {
  return str.substring(1)
}

export async function applyQuery (dataset: any, sparqlQuery: string): Promise<string> {
  const store = new Store()
  dataset.forEach((quad: any) => {
    debug('quad', quad.toString())
    store.addQuad(quad)
  })
  const myEngine = newEngine()
  const result: any = await myEngine.query(sparqlQuery,
    { sources: [ { type: 'rdfjsSource', value: store } ] })
  const bindings = await new Promise((resolve) => {
    const bindings: any = []
    result.bindingsStream.on('end', () => {
      resolve(bindings)
    })
    result.bindingsStream.on('data', (data: any) => {
      const binding: any = {}
      const obj = JSON.parse(JSON.stringify(data))
      debug(obj)
      for (const key in obj) {
        binding[removeLeadingQuestionMark(key)] = {
          type: obj[key].termType.toLowerCase(),
          value: obj[key].value
        }
      }
      bindings.push(binding)
    })
  })
  return JSON.stringify({
    head: {
      vars: result.variables.map(removeLeadingQuestionMark)
    },
    results: {
      ordered: false,
      distinct: false,
      bindings
    }
  })
}
