import { Parser } from 'sparqljs'

export async function applyQuery (store: any, sparqlQuery: string) {
  const parser = new Parser()
  const parsedQuery = parser.parse(sparqlQuery)
  // TODO: implement
}
