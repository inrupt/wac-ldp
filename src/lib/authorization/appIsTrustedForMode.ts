
import Debug from 'debug'
import { ACL } from '../rdf/rdf-constants'
import { StoreManager, RdfJsTerm } from '../rdf/StoreManager'
import { urlToRdfJsTerm, stringToRdfJsTerm, rdfNodeToString } from '../rdf/RdfLibStoreManager'

const debug = Debug('appIsTrustedForMode')
const OWNER_PROFILES_FETCH_TIMEOUT = 2000

export interface OriginCheckTask {
  origin: string
  mode: URL
  resourceOwners: Array<URL>
}

// FIXME: It's weird that setAppModes is in the RDF module, but getAppModes is in the authorization module.

export function urlToDocUrl (url: URL): URL {
  return new URL(url.toString().split('#')[0])
}

export async function getAppModes (webId: URL, origin: string, storeManager: StoreManager): Promise<Array<URL>> {
  const webIdDoc: URL = urlToDocUrl(webId)
  const webIdDocNode: RdfJsTerm = urlToRdfJsTerm(webIdDoc)
  debug(storeManager)
  // await storeManager.load(webIdDoc)
  const trustedAppNodes: Array<RdfJsTerm> = await storeManager.subjectsMatching({
    predicate: urlToRdfJsTerm(ACL.origin),
    object: stringToRdfJsTerm(origin),
    graph: webIdDocNode
  })
  debug({ trustedAppNodes })
  const modes: any = {}
  await Promise.all(trustedAppNodes.map(async (node: RdfJsTerm) => {
    const trustStatements = await storeManager.match({
      subject: urlToRdfJsTerm(webId),
      predicate: urlToRdfJsTerm(ACL.trustedApp),
      object: node,
      graph: webIdDocNode
    })
    debug({ trustStatements })
    if (trustStatements.length > 0) {
      const modeNodes: Array<RdfJsTerm> = await storeManager.objectsMatching({
        subject: node,
        predicate: urlToRdfJsTerm(ACL.mode),
        graph: webIdDocNode
      })
      await Promise.all(modeNodes.map(async (node: RdfJsTerm) => {
        modes[rdfNodeToString(node)] = true
      }))
    }
  }))
  return Object.keys(modes).map(str => new URL(str))
}
async function checkOwnerProfile (webId: URL, origin: string, mode: URL, storeManager: StoreManager): Promise<boolean> {
  debug('checking app modes', webId, origin, storeManager)
  const appModes = await getAppModes(webId, origin, storeManager)
  for (let i = 0; i < appModes.length; i++) {
    if (appModes[i].toString() === mode.toString()) {
      return true
    }
  }
  debug('returning false')
  return false
}

export async function appIsTrustedForMode (task: OriginCheckTask, storeManager: StoreManager): Promise<boolean> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, OWNER_PROFILES_FETCH_TIMEOUT)
    const done = Promise.all(task.resourceOwners.map(async (webId: URL) => {
      if (await checkOwnerProfile(webId, task.origin, task.mode, storeManager)) {
        resolve(true)
      }
    }))
    // tslint:disable-next-line: no-floating-promises
    done.then(() => {
      resolve(false)
    })
  })
}
