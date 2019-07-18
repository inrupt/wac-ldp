import Debug from 'debug'
import * as rdflib from 'rdflib'
import { BlobTree, urlToPath } from '../storage/BlobTree'
import { streamToObject, ResourceData, objectToStream, makeResourceData } from './ResourceDataUtils'
import { ACL } from './rdf-constants'

const debug = Debug('setAppModes')

export async function setAppModes (webId: URL, origin: string, modes: Array<URL>, storage: BlobTree): Promise<void> {
  debug(`Registering app (${origin}) with accessModes ${modes.map(url => url.toString()).join(', ')} for webId ${webId}`)
  const blob = storage.getBlob(urlToPath(webId))
  const stream = await blob.getData()
  debug('stream', typeof stream)
  let resourceData
  if (stream) {
    resourceData = await streamToObject(stream) as ResourceData
  } else {
    throw new Error(`WebId ${webId.toString()} not found on this server`)
  }
  const store = rdflib.graph()
  const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
  parse(resourceData.body, store, webId.toString(), resourceData.contentType)
  debug('before patch', store.toNT())

  const originSym = rdflib.sym(origin)
  // remove existing statements on same origin - if it exists
  store.statementsMatching(null, ACL['origin'], origin).forEach((st: any) => {
    store.removeStatements([...store.statementsMatching(null, ACL['trustedApp'], st.subject)])
    store.removeStatements([...store.statementsMatching(st.subject)])
  })

  // add new triples
  const application = new rdflib.BlankNode()
  store.add(rdflib.sym(webId), ACL['trustedApp'], application, webId)
  store.add(application, ACL['origin'], origin, webId)

  modes.forEach(mode => {
    store.add(application, ACL['mode'], mode)
  })
  const turtleDoc: string = rdflib.serialize(undefined, store, webId, 'text/turtle')
  await blob.setData(await objectToStream(makeResourceData(resourceData.contentType, turtleDoc)))
}
