import * as http from 'http'
import { URL } from 'url'
import Debug from 'debug'
import { determineWebId } from '../../auth/determineWebId'

const debug = Debug('HttpParser')

export enum TaskType {
  containerRead,
  containerMemberAdd,
  containerDelete,
  globRead,
  blobRead,
  blobWrite,
  blobUpdate,
  blobDelete,
  getOptions,
  unknown
}

function determineTaskType (method: string | undefined, url: string | undefined): TaskType {
  if (!method || !url) {
    return TaskType.unknown
  }
  // if the URL end with a / then the path indicates a container
  // if the URL end with /* then the path indicates a glob
  // in all other cases, the path indicates a blob

  let lastUrlChar = url.substr(-1)
  if (['/', '*'].indexOf(lastUrlChar) === -1) {
    lastUrlChar = '(other)'
  }

  const methodMap: { [lastUrlChar: string]: { [method: string]: TaskType | undefined }} = {
    '/': {
      OPTIONS: TaskType.getOptions,
      HEAD: TaskType.containerRead,
      GET: TaskType.containerRead,
      POST: TaskType.containerMemberAdd,
      PUT: TaskType.containerMemberAdd,
      DELETE: TaskType.containerDelete
    },
    '*': {
      OPTIONS: TaskType.getOptions,
      HEAD: TaskType.globRead,
      GET: TaskType.globRead
    },
    '(other)': {
      OPTIONS: TaskType.getOptions,
      HEAD: TaskType.blobRead,
      GET: TaskType.blobRead,
      PUT: TaskType.blobWrite,
      PATCH: TaskType.blobUpdate,
      DELETE: TaskType.blobDelete
    }
  }
  debug('determining task type', lastUrlChar, method, methodMap[lastUrlChar][method])
  const taskType = methodMap[lastUrlChar][method]
  return (taskType === undefined ? TaskType.unknown : taskType)
}

function determineOrigin (headers: http.IncomingHttpHeaders): string | undefined {
  debug('determining origin', headers)
  if (Array.isArray(headers.origin)) {
    return headers.origin[0]
  } else {
    return headers.origin
  }
}

function determineContentType (headers: http.IncomingHttpHeaders): string | undefined {
  return headers['content-type']
}

function determineIfMatch (headers: http.IncomingHttpHeaders): string | undefined {
  try {
    debug(headers)
    return headers['if-match'] && headers['if-match'].split('"')[1]
  } catch (error) {
    // return undefined
  }
}

function determineIfNoneMatchStar (headers: http.IncomingHttpHeaders): boolean {
  try {
    return headers['if-none-match'] === '*'
  } catch (error) {
    return false
  }
}

function determineIfNoneMatchList (headers: http.IncomingHttpHeaders): Array<string> | undefined {
  try {
    if (headers['if-none-match'] && headers['if-none-match'] !== '*') {
      return headers['if-none-match'].split(',').map(x => x.split('"')[1])
    }
  } catch (error) {
    // return undefined
  }
}

function determineOmitBody (method: string | undefined): boolean {
  if (!method) {
    return true
  }
  return (['OPTIONS', 'HEAD'].indexOf(method) !== -1)
}

function determineAsJsonLd (headers: http.IncomingHttpHeaders): boolean {
  // TODO: use RdfType enum here and 'whatwg-mimetype' package from ResourceDataUtils
  try {
    return (!!headers['content-type'] && headers['content-type'].split(';')[0] === 'application/ld+json')
  } catch (e) {
    return false
  }
}

function determineBearerToken (headers: http.IncomingHttpHeaders): string | undefined {
  try {
    debug(headers, 'authorization')
    return headers['authorization'] && headers['authorization'].substring('Bearer '.length)
  } catch (error) {
    debug('no bearer token found') // TODO: allow other ways of providing a PoP token
  }
  return undefined
}

function determineSparqlQuery (urlPath: string | undefined): string | undefined {
  const url = new URL('http://example.com' + urlPath)
  debug('determining sparql query', urlPath, url.searchParams, url.searchParams.get('query'))
  return url.searchParams.get('query') || undefined
}

function determineFullUrl (hostname: string, httpReq: http.IncomingMessage): URL {
  if (httpReq.url && httpReq.url.substr(-1) === '*') {
    return new URL(hostname + httpReq.url.substring(0, httpReq.url.length - 1))
  }
  return new URL(hostname + httpReq.url)
}

function determinePreferMinimalContainer (headers: http.IncomingHttpHeaders): boolean {
  // FIXME: this implementation is just a placeholder, should find a proper prefer-header parsing lib for this:
  if (headers['prefer'] && headers['prefer'] === 'return=representation; include="http://www.w3.org/ns/ldp#PreferMinimalContainer"') {
    return true
  }
  if (headers['prefer'] && headers['prefer'] === 'return=representation; omit="http://www.w3.org/ns/ldp#PreferContainment"') {
    return true
  }
  return false
}

export class WacLdpTask {
  cache: {
    bearerToken?: { value: string | undefined },
    isContainer?: { value: boolean },
    origin?: { value: string | undefined },
    contentType?: { value: string | undefined },
    ifMatch?: { value: string | undefined },
    ifNoneMatchStar?: { value: boolean },
    ifNoneMatchList?: { value: Array<string> | undefined },
    wacLdpTaskType?: { value: TaskType },
    sparqlQuery?: { value: string | undefined },
    asJsonLd?: { value: boolean },
    omitBody?: { value: boolean },
    fullUrl?: { value: URL },
    preferMinimalContainer?: { value: boolean },
    requestBody?: { value: Promise<string> },
    webId?: { value: Promise<URL | undefined> }
  }
  hostName: string
  httpReq: http.IncomingMessage
  constructor (hostName: string, httpReq: http.IncomingMessage) {
    this.hostName = hostName
    this.httpReq = httpReq
    this.cache = {}
  }
  isContainer () {
    if (!this.cache.isContainer) {
      this.cache.isContainer = {
        value: (!!this.httpReq.url && (
          this.httpReq.url.substr(-1) === '/' || this.httpReq.url.substr(-2) === '/*'))
      }
    }
    return this.cache.isContainer.value
  }

  bearerToken (): string | undefined {
    if (!this.cache.bearerToken) {
      this.cache.bearerToken = {
        value: determineBearerToken(this.httpReq.headers)
      }
    }
    return this.cache.bearerToken.value
  }

  origin (): string | undefined {
    if (!this.cache.origin) {
      this.cache.origin = {
        value: determineOrigin(this.httpReq.headers)
      }
    }
    return this.cache.origin.value
  }

  contentType (): string | undefined {
    if (!this.cache.contentType) {
      this.cache.contentType = {
        value: determineContentType(this.httpReq.headers)
      }
    }
    return this.cache.contentType.value
  }

  ifMatch (): string | undefined {
    if (!this.cache.ifMatch) {
      this.cache.ifMatch = {
        value: determineIfMatch(this.httpReq.headers)
      }
    }
    return this.cache.ifMatch.value
  }

  ifNoneMatchStar (): boolean {
    if (!this.cache.ifNoneMatchStar) {
      this.cache.ifNoneMatchStar = {
        value: determineIfNoneMatchStar(this.httpReq.headers)
      }
    }
    return this.cache.ifNoneMatchStar.value
  }

  ifNoneMatchList (): Array<string> | undefined {
    if (!this.cache.ifNoneMatchList) {
      this.cache.ifNoneMatchList = {
        value: determineIfNoneMatchList(this.httpReq.headers)
      }
    }
    return this.cache.ifNoneMatchList.value
  }

  wacLdpTaskType (): TaskType {
    if (!this.cache.wacLdpTaskType) {
      this.cache.wacLdpTaskType = {
        value: determineTaskType(this.httpReq.method, this.httpReq.url)
      }
    }
    return this.cache.wacLdpTaskType.value
  }

  sparqlQuery (): string | undefined {
    if (!this.cache.sparqlQuery) {
      this.cache.sparqlQuery = {
        value: determineSparqlQuery(this.httpReq.url)
      }
    }
    return this.cache.sparqlQuery.value
  }

  asJsonLd (): boolean {
    if (!this.cache.asJsonLd) {
      this.cache.asJsonLd = {
        value: determineAsJsonLd(this.httpReq.headers)
      }
    }
    return this.cache.asJsonLd.value
  }

  omitBody (): boolean {
    if (!this.cache.omitBody) {
      this.cache.omitBody = {
        value: determineOmitBody(this.httpReq.method)
      }
    }
    return this.cache.omitBody.value
  }

  fullUrl (): URL {
    if (!this.cache.fullUrl) {
      this.cache.fullUrl = {
        value: determineFullUrl(this.hostName, this.httpReq)
      }
    }
    return this.cache.fullUrl.value
  }

  preferMinimalContainer (): boolean {
    if (!this.cache.preferMinimalContainer) {
      this.cache.preferMinimalContainer = {
        value: determinePreferMinimalContainer(this.httpReq.headers)
      }
    }
    return this.cache.preferMinimalContainer.value
  }

  requestBody (): Promise<string> {
    let requestBodyStr: string
    if (!this.cache.requestBody) {
      this.cache.requestBody = {
        value: new Promise(resolve => {
          requestBodyStr = ''
          this.httpReq.on('data', chunk => {
            requestBodyStr += chunk
          })
          this.httpReq.on('end', () => {
            resolve(requestBodyStr)
          })
        })
      }
    }
    return this.cache.requestBody.value
  }
  // edge case if we can still consider this as lazy request parsing,
  // but had to move it here because most operation handlers rely on it.
  webId (): Promise<URL | undefined> {
    if (!this.cache.webId) {
      this.cache.webId = {
        value: determineWebId(this.bearerToken(), this.hostName)
      }
    }
    return this.cache.webId.value
  }

  // this one is maybe a bit weird too, open to suggestions
  // for making this simpler
  convertToBlobWrite (memberName: string) {
    if (!this.isContainer()) {
      throw new Error('only containers can be converted to blob writes')
    }
    if (memberName.indexOf('/') !== -1) {
      throw new Error('memberName cannot contain slashes')
    }
    const newUrlStr: string = this.fullUrl().toString() + memberName
    this.cache.fullUrl = {
      value: new URL(newUrlStr)
    }
    this.cache.wacLdpTaskType = { value: TaskType.blobWrite }
    this.cache.isContainer = { value: false }
    debug('converted', this.cache)
  }
}
