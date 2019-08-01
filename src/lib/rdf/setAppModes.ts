import Debug from 'debug'
import { ACL } from './rdf-constants'
import * as url from 'url'
import { StoreManager, RdfJsTerm } from './StoreManager'
import { urlToRdfJsTerm, stringToRdfJsTerm, newBlankNode } from './RdfLibStoreManager'

const debug = Debug('setAppModes')

// FIXME: It's weird that setAppModes is in the RDF module, but getAppModes is in the auth module.

export async function setAppModes (webId: URL, origin: string, modes: Array<URL>, storeManager: StoreManager): Promise<void> {
  debug(`Registering app (${origin}) with accessModes ${modes.map(url => url.toString()).join(', ')} for webId ${webId.toString()}`)
  const webIdDocUrl = new URL(url.format(webId, { fragment: false }))
  // remove existing statements on same origin - if it exists
  debug('finding statements about ', origin)
  const existingNodes = await storeManager.subjectsMatching({
    predicate: urlToRdfJsTerm(ACL['origin']),
    object: stringToRdfJsTerm(origin),
    graph: urlToRdfJsTerm(webIdDocUrl)
  })
  debug('removing trustedApp statements with objects ', existingNodes.map((node: RdfJsTerm) => node.value))
  await storeManager.deleteMatches({
    predicate: urlToRdfJsTerm(ACL.trustedApp),
    object: existingNodes,
    graph: urlToRdfJsTerm(webIdDocUrl)
  })
  debug('removing statements with subjects ', existingNodes.map((node: RdfJsTerm) => node.value))
  await storeManager.deleteMatches({
    subject: existingNodes,
    graph: urlToRdfJsTerm(webIdDocUrl)
  })
  debug('after removing', storeManager)

  // add new triples
  const application: RdfJsTerm = newBlankNode()
  await storeManager.addQuad({
    subject: urlToRdfJsTerm(webId),
    predicate: urlToRdfJsTerm(ACL.trustedApp),
    object: application,
    graph: urlToRdfJsTerm(webIdDocUrl)
  })
  await storeManager.addQuad({
    subject: application,
    predicate: urlToRdfJsTerm(ACL.origin),
    object: stringToRdfJsTerm(origin),
    graph: urlToRdfJsTerm(webIdDocUrl)
  })

  await Promise.all(modes.map(mode => {
    debug('adding', application, ACL.mode.toString(), mode)
    return storeManager.addQuad({
      subject: application,
      predicate: urlToRdfJsTerm(ACL.mode),
      object: urlToRdfJsTerm(mode),
      graph: urlToRdfJsTerm(webIdDocUrl)
    })
  }))
  debug('after patch', storeManager)
  await storeManager.save(webId)
}
