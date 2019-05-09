import * as http from 'http'
import { URL } from 'url'
import Debug from 'debug'
import { WacLdpResponse, ResultType, ErrorResult } from './HttpResponder'
import { Path } from '../../storage/BlobTree'

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

function determinePath (urlPath: string | undefined) {
  let pathToUse = (urlPath ? 'root' + urlPath : 'root/')
  pathToUse = pathToUse.split('?')[0]
  if (pathToUse.substr(-2) === '/*') {
    pathToUse = pathToUse.substring(0, pathToUse.length - 2)
  } else if (pathToUse.substr(-1) === '/') {
    pathToUse = pathToUse.substring(0, pathToUse.length - 1)
  }
  return new Path((pathToUse).split('/'))
}

function determineSparqlQuery (urlPath: string | undefined): string | undefined {
  const url = new URL('http://example.com' + urlPath)
  debug('determining sparql query', urlPath, url.searchParams, url.searchParams.get('query'))
  return url.searchParams.get('query') || undefined
}

function determineFullUrl (hostname: string, httpReq: http.IncomingMessage): string {
  return hostname + httpReq.url
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

// parse the http request to extract some basic info (e.g. is it a container?)
export async function parseHttpRequest (hostname: string, httpReq: http.IncomingMessage): Promise<WacLdpTask> {
  debug('LdpParserTask!')
  let errorCode = null // todo actually use this. maybe with try-catch?
  const isContainer = (httpReq.url && (httpReq.url.substr(-1) === '/' || httpReq.url.substr(-2) === '/*'))
  const parsedTask = {
    isContainer,
    omitBody: determineOmitBody(httpReq.method),
    origin: determineOrigin(httpReq.headers),
    contentType: determineContentType(httpReq.headers),
    ifMatch: determineIfMatch(httpReq.headers),
    ifNoneMatchStar: determineIfNoneMatchStar(httpReq.headers),
    ifNoneMatchList: determineIfNoneMatchList(httpReq.headers),
    asJsonLd: determineAsJsonLd(httpReq.headers),
    wacLdpTaskType: determineTaskType(httpReq.method, httpReq.url),
    bearerToken: determineBearerToken(httpReq.headers),
    requestBody: undefined,
    path: determinePath(httpReq.url),
    sparqlQuery: determineSparqlQuery(httpReq.url),
    fullUrl: determineFullUrl(hostname, httpReq),
    preferMinimalContainer: determinePreferMinimalContainer(httpReq.headers)
  } as WacLdpTask
  await new Promise(resolve => {
    parsedTask.requestBody = ''
    httpReq.on('data', chunk => {
      parsedTask.requestBody += chunk
    })
    httpReq.on('end', resolve)
  })
  debug('parsed http request', parsedTask)
  // if (errorCode === null) {
  return parsedTask
  // } else {
  //   throw new ErrorResult(ResultType.CouldNotParse)
  // }
}

export interface WacLdpTask {
  isContainer: boolean
  omitBody: boolean
  asJsonLd: boolean
  origin: string | undefined
  contentType: string | undefined
  ifMatch: string | undefined
  ifNoneMatchStar: boolean
  ifNoneMatchList: Array<string> | undefined
  bearerToken: string | undefined
  wacLdpTaskType: TaskType
  path: Path,
  sparqlQuery: string | undefined
  fullUrl: string,
  requestBody: string | undefined
  preferMinimalContainer: boolean
}
