
import Debug from 'debug'
import { ACL, RDF } from '../rdf/rdf-constants'
import { RdfFetcher } from '../rdf/RdfFetcher'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('DetermineAllowedModeForOrigin')

const OWNER_PROFILES_FETCH_TIMEOUT = 2000

const ownerProfilesCache: { [webId: string]: string } = {}

export interface OriginCheckTask {
  origin: string,
  mode: string,
  resourceOwners: Array<URL>
}

async function checkOwnerProfile (webId: URL, origin: string, mode: string, graphFetcher: RdfFetcher): Promise<boolean> {
  if (!ownerProfilesCache[webId.toString()]) {
    ownerProfilesCache[webId.toString()] = await graphFetcher.fetchGraph(webId)
  }
  return Promise.resolve(false)
}

export async function appIsTrustedForMode (task: OriginCheckTask, graphFetcher: RdfFetcher): Promise<boolean> {
  return Promise.resolve(true) // FIXME
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, OWNER_PROFILES_FETCH_TIMEOUT)
    const done = Promise.all(task.resourceOwners.map(async (webId: URL) => {
      if (await checkOwnerProfile(webId, task.origin, task.mode, graphFetcher)) {
        resolve(true)
      }
    }))
    // tslint:disable-next-line: no-floating-promises
    done.then(() => {
      resolve(false)
    })
  })
}
