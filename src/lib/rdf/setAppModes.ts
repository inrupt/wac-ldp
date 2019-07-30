import Debug from 'debug'
import { ACL } from './rdf-constants'
import * as url from 'url'
import { StoreManager, urlToRdfNode, stringToRdfNode, RdfNode, newBlankNode } from './StoreManager'

const debug = Debug('setAppModes')

// FIXME: It's weird that setAppModes is in the RDF module, but getAppModes is in the auth module.

export async function setAppModes (webId: URL, origin: string, modes: Array<URL>, storeManager: StoreManager): Promise<void> {
  debug(`Registering app (${origin}) with accessModes ${modes.map(url => url.toString()).join(', ')} for webId ${webId.toString()}`)
  const webIdDocUrl = new URL(url.format(webId, { fragment: false }))
  // remove existing statements on same origin - if it exists
  debug('finding statements about ', origin)
  const existingNodes = await storeManager.subjectsMatching({
    predicate: urlToRdfNode(ACL['origin']),
    object: stringToRdfNode(origin),
    why: urlToRdfNode(webIdDocUrl)
  })
  debug('removing trustedApp statements with objects ', existingNodes.map((node: RdfNode) => node.value))
  await storeManager.removeStatements({
    predicate: urlToRdfNode(ACL.trustedApp),
    object: existingNodes,
    why: urlToRdfNode(webIdDocUrl)
  })
  debug('removing statements with subjects ', existingNodes.map((node: RdfNode) => node.value))
  await storeManager.removeStatements({
    subject: existingNodes,
    why: urlToRdfNode(webIdDocUrl)
  })
  debug('after removing', storeManager)

  // add new triples
  const application = newBlankNode()
  await storeManager.addQuad({
    subject: urlToRdfNode(webId),
    predicate: urlToRdfNode(ACL.trustedApp),
    object: application,
    why: urlToRdfNode(webIdDocUrl)
  })
  await storeManager.addQuad({
    subject: application,
    predicate: urlToRdfNode(ACL.origin),
    object: stringToRdfNode(origin),
    why: urlToRdfNode(webIdDocUrl)
  })

  await Promise.all(modes.map(mode => {
    debug('adding', application, ACL.mode.toString(), mode)
    return storeManager.addQuad({
      subject: application,
      predicate: urlToRdfNode(ACL.mode),
      object: urlToRdfNode(mode),
      why: urlToRdfNode(webIdDocUrl)
    })
  }))
  debug('after patch', storeManager)
  await storeManager.save(webId)
}
