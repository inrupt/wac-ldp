import * as rdflib from 'rdflib'
import Debug from 'debug'
import { ResourceData } from './ResourceDataUtils'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'

const debug = Debug('Apply Patch')

export async function applyPatch (resourceData: ResourceData, sparqlQuery: string, fullUrl: URL, appendOnly: boolean) {
  const store = rdflib.graph()
  const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
  parse(resourceData.body, store, fullUrl.toString(), resourceData.contentType)
  debug('before patch', store.toNT())

  const sparqlUpdateParser = rdflib.sparqlUpdateParser as unknown as (patch: string, store: any, url: string) => any
  const patchObject = sparqlUpdateParser(sparqlQuery, rdflib.graph(), fullUrl.toString())
  debug('patchObject', patchObject)
  if (appendOnly && typeof patchObject.delete !== 'undefined') {
    debug('appendOnly and patch contains deletes')
    throw new ErrorResult(ResultType.AccessDenied)
  }
  await new Promise((resolve, reject) => {
    store.applyPatch(patchObject, store.sym(fullUrl), (err: Error) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
  debug('after patch', store.toNT())
  return rdflib.serialize(undefined, store, fullUrl, 'text/turtle')
}
