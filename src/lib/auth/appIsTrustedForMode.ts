
import Debug from 'debug'
import { ACL, RDF } from '../rdf/rdf-constants'
import { RdfFetcher } from '../rdf/RdfFetcher'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('appIsTrustedForMode')

const OWNER_PROFILES_FETCH_TIMEOUT = 2000

const ownerProfilesCache: { [webId: string]: any } = {}

export interface OriginCheckTask {
  origin: string
  mode: URL
  resourceOwners: Array<URL>
}

async function checkOwnerProfile (webId: URL, origin: string, mode: URL, rdfFetcher: RdfFetcher): Promise<boolean> {
  // TODO: move this cache into a decorator pattern, see #81
  if (!ownerProfilesCache[webId.toString()]) {
    debug('cache miss', webId)
    ownerProfilesCache[webId.toString()] = await rdfFetcher.fetchGraph(webId)
    if (!ownerProfilesCache[webId.toString()]) {
      return Promise.resolve(false)
    }
  }
  const quads: Array<any> = []
  try {
    ownerProfilesCache[webId.toString()].map((quad: any) => {
      debug('reading quad', quad)
      quads.push(quad)
    })
  } catch (err) {
    debug('error looping over quads', err)
  }
  const appNodes: { [indexer: string]: any } = {}
  function ensure (str: string) {
    if (!appNodes[str]) {
      appNodes[str] = {}
    }
  }
  debug('looking for quads:', webId.toString(), origin, mode.toString())
  quads.forEach((quad: any): void => {
    debug('considering quad', quad)
    switch (quad.predicate.value) {
      case ACL.mode.toString():
        debug('mode predicate!', quad.predicate.value, mode.toString())
        if (mode.toString() === quad.object.value) {
          ensure(quad.subject.value)
          appNodes[quad.subject.value].modeMatches = true
        }
        break
      case ACL.origin.toString():
        debug('origin predicate!', quad.predicate.value, origin)
        if (origin === quad.object.value) {
          ensure(quad.subject.value)
          appNodes[quad.subject.value].originMatches = true
        }
        break
      case ACL.trustedApp.toString():
        debug('trustedApp predicate!', quad.predicate.value, webId.toString())
        if (webId.toString() === quad.subject.value) {
          ensure(quad.object.value)
          appNodes[quad.object.value].webIdMatches = true
        }
        break
      default:
        debug('unknown predicate!', quad.predicate.value)
    }
  })
  debug('appNodes', appNodes)
  let found = false
  Object.keys(appNodes).map(nodeName => {
    debug('considering', nodeName, appNodes[nodeName])
    if (appNodes[nodeName].webIdMatches && appNodes[nodeName].originMatches && appNodes[nodeName].modeMatches) {
      debug('found')
      found = true
    }
  })
  debug('returning', found)
  return found
}

export async function appIsTrustedForMode (task: OriginCheckTask, graphFetcher: RdfFetcher): Promise<boolean> {
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
