import Debug from 'debug'
import { WacLdpResponse, ResultType, ErrorResult } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { Blob } from '../storage/Blob'
import * as rdflib from 'rdflib'
import { streamToObject, ResourceData } from '../util/ResourceDataUtils'

const debug = Debug('updateBlob')

export async function updateBlob (task: WacLdpTask, blob: Blob, appendOnly: boolean): Promise<WacLdpResponse> {
  debug('operation updateBlob!')
  const resourceData = await streamToObject(await blob.getData()) as ResourceData
  const graph = rdflib.graph()
  const $rdf = require('rdflib')
  const store = $rdf.graph()
  const url = 'http://example.org/foo/bar'
  const before = `
  @base <http://example.org/> .
  @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
  @prefix foaf: <http://xmlns.com/foaf/0.1/> .
  @prefix rel: <http://www.perceive.net/schemas/relationship/> .

  <#green-goblin>
      rel:enemyOf <#spiderman> ;
      a foaf:Person ;    # in the context of the Marvel universe
      foaf:name "Green Goblin" .
  `

  $rdf.parse(before, store, url, 'text/turtle')
  console.log('before', store.toNT())

  const patchText = `
  @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
  @prefix foaf: <http://xmlns.com/foaf/0.1/> .
  @prefix rel: <http://www.perceive.net/schemas/relationship/> .

  INSERT DATA {
      <#spiderman>
          rel:enemyOf <#green-goblin> ;
          a foaf:Person ;
          foaf:name "Spiderman", "Человек-паук"@ru .
  }`
  const patchObject = $rdf.sparqlUpdateParser(patchText, $rdf.graph(), url)
  store.applyPatch(patchObject, store.sym(url), (err: Error) => {
    console.error(err)
  })
  console.log('after', store.toNT())

  return {
    resultType: ResultType.OkayWithoutBody
  } as WacLdpResponse
}
