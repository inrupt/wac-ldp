import rdf from 'rdf-ext'
import Debug from 'debug'
import convert from 'buffer-to-stream'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'

import { newEngine } from '@comunica/actor-init-sparql'

const debug = Debug('apply-query')

export async function applyQuery (dataset: any, sparqlQuery: string) {
  const myEngine = newEngine()
  console.log('executing')
  const result = await myEngine.query(sparqlQuery,
    { sources: [ dataset ] })
  console.log(typeof result) // .bindingsStream.on('data', (data: any) => console.log(data.toObject()))
  return result
}
