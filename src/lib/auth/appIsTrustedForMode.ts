
import Debug from 'debug'
import { ACL, RDF } from '../rdf/rdf-constants'
import { RdfLayer } from '../rdf/RdfLayer'
import { BlobTree } from '../storage/BlobTree'

const debug = Debug('appIsTrustedForMode')

const OWNER_PROFILES_FETCH_TIMEOUT = 2000

const ownerProfilesCache: { [webId: string]: any } = {}

export interface OriginCheckTask {
  origin: string
  mode: URL
  resourceOwners: Array<URL>
}

export async function setAppModes (webId: URL, origin: string, modes: Array<URL>, rdfLayer: RdfLayer): Promise<void> {
  throw new Error('to do: implement!')
}

export async function getAppModes (webId: URL, origin: string, rdfLayer: RdfLayer): Promise<Array<URL>> {
  // TODO: move this cache into a decorator pattern, see #81
  debug('checkOwnerProfile', webId.toString(), origin)
  if (!ownerProfilesCache[webId.toString()]) {
    debug('cache miss', webId.toString())
    ownerProfilesCache[webId.toString()] = await rdfLayer.fetchGraph(webId)
    if (!ownerProfilesCache[webId.toString()]) {
      return Promise.resolve([])
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
  interface AppNode {
    originMatches?: boolean
    modes: Array<URL>
    webIdMatches?: boolean
  }
  const appNodes: { [indexer: string]: AppNode } = {}
  function ensure (str: string) {
    if (!appNodes[str]) {
      appNodes[str] = {
        modes: []
      }
    }
  }
  debug('looking for quads:', webId.toString(), origin)
  quads.forEach((quad: any): void => {
    debug('considering quad', quad)
    switch (quad.predicate.value) {
      case ACL.mode.toString():
        debug('mode predicate!', quad.predicate.value)
        ensure(quad.subject.value)
        appNodes[quad.subject.value].modes.push(new URL(quad.object.value))
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
  for (let nodeName of Object.keys(appNodes)) {
    debug('considering', nodeName, appNodes[nodeName])
    if (appNodes[nodeName].webIdMatches && appNodes[nodeName].originMatches) {
      return appNodes[nodeName].modes
    }
  }
  return []
}
async function checkOwnerProfile (webId: URL, origin: string, mode: URL, rdfLayer: RdfLayer): Promise<boolean> {
  const appModes = await getAppModes(webId, origin, rdfLayer)
  for (let i = 0; i < appModes.length; i++) {
    if (appModes[i].toString() === mode.toString()) {
      return true
    }
  }
  debug('returning false')
  return false
}

export async function appIsTrustedForMode (task: OriginCheckTask, graphFetcher: RdfLayer): Promise<boolean> {
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
