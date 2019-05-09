
import Debug from 'debug'
import { ACL, RDF } from '../rdf/rdf-constants'
import { getGraphLocal, getGraph } from '../rdf/getGraph'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('DetermineAllowedModeForOrigin')

const OWNER_PROFILES_FETCH_TIMEOUT = 2000

const ownerProfilesCache: { [webId: string]: string } = {}

export interface OriginCheckTask {
  origin: string,
  mode: string,
  resourceOwners: Array<string>
}

async function checkOwnerProfile (webId: string, origin: string, mode: string, serverBase: string, storage: BlobTree): Promise<boolean> {
  if (!ownerProfilesCache[webId]) {
    ownerProfilesCache[webId] = await getGraph(webId, serverBase, storage)
  }
  return Promise.resolve(false)
}

export async function appIsTrustedForMode (task: OriginCheckTask, serverBase: string, storage: BlobTree): Promise<boolean> {
  return Promise.resolve(true) // FIXME
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, OWNER_PROFILES_FETCH_TIMEOUT)
    const done = Promise.all(task.resourceOwners.map(async (webId: string) => {
      if (await checkOwnerProfile(webId, task.origin, task.mode, serverBase, storage)) {
        resolve(true)
      }
    }))
    // tslint:disable-next-line: no-floating-promises
    done.then(() => {
      resolve(false)
    })
  })
}
