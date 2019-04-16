import * as http from 'http'
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
  unknown
}

function determineTaskType (httpReq: http.IncomingMessage): TaskType {
  // if the URL end with a / then the path indicates a container
  // if the URL end with /* then the path indicates a glob
  // in all other cases, the path indicates a blob

  let lastUrlChar = httpReq.url.substr(-1)
  if (['/', '*'].indexOf(lastUrlChar) === -1) {
    lastUrlChar = '(other)'
  }

  const methodMap = {
    '/': {
      OPTIONS: TaskType.containerRead,
      HEAD: TaskType.containerRead,
      GET: TaskType.containerRead,
      POST: TaskType.containerMemberAdd,
      PUT: TaskType.containerMemberAdd,
      DELETE: TaskType.containerDelete
    },
    '*': {
      OPTIONS: TaskType.globRead,
      HEAD: TaskType.globRead,
      GET: TaskType.globRead
    },
    '(other)': {
      OPTIONS: TaskType.blobRead,
      HEAD: TaskType.blobRead,
      GET: TaskType.blobRead,
      PUT: TaskType.blobWrite,
      PATCH: TaskType.blobUpdate,
      DELETE: TaskType.blobDelete
    }
  }
  return methodMap[lastUrlChar][httpReq.method] || TaskType.unknown
}

function determineOrigin (httpReq: http.IncomingMessage): string | undefined {
  if (Array.isArray(httpReq.headers.origin)) {
    return httpReq.headers.origin[0]
  } else {
    return httpReq.headers.origin
  }
}

function determineContentType (httpReq: http.IncomingMessage): string | undefined {
  return httpReq.headers['content-type']
}

function determineIfMatch (httpReq: http.IncomingMessage): string | undefined {
  try {
    return httpReq.headers['if-match'].split('"')[1]
  } catch (error) {
    // return undefined
  }
}

function determineIfNoneMatch (httpReq: http.IncomingMessage): Array<string> | undefined {
  try {
    return httpReq.headers['if-none-match'].split(',').map(x => x.split('"')[1])
  } catch (error) {
    // return undefined
  }
}

function determineOmitBody (httpReq: http.IncomingMessage): boolean {
  return (['OPTIONS', 'HEAD'].indexOf(httpReq.method) !== -1)
}

function determineAsJsonLd (httpReq: http.IncomingMessage): boolean {
  try {
    return (httpReq.headers['content-type'].split(';')[0] === 'application/json+ld')
  } catch (e) {
    return false
  }
}

// parse the http request to extract some basic info (e.g. is it a container?)
export async function parseHttpRequest (httpReq: http.IncomingMessage): Promise<WacLdpTask> {
  debug('LdpParserTask!')
  let errorCode = null // todo actually use this. maybe with try-catch?
  const parsedTask = {
    mayIncreaseDiskUsage: this.determineMayIncreaseDiskUsage(httpReq),
    omitBody: this.determineOmitBody(httpReq),
    isContainer: (httpReq.url.substr(-1) === '/'), // FIXME: code duplication, see determineLdpParserResultName above
    origin: this.determineOrigin(httpReq),
    contentType: this.determineContentType(httpReq),
    ifMatch: this.determineIfMatch(httpReq),
    ifNoneMatch: this.determineIfNoneMatch(httpReq),
    asJsonLd: this.determineAsJsonLd(httpReq),
    ldpTaskType: this.determineTaskType(httpReq),
    requestBody: undefined,
    path: new Path(('root' + httpReq.url).split('/'))
  } as WacLdpTask
  await new Promise(resolve => {
    parsedTask.requestBody = ''
    httpReq.on('data', chunk => {
      parsedTask.requestBody += chunk
    })
    httpReq.on('end', resolve)
  })
  debug('parsed http request', {
    method: httpReq.method,
    headers: httpReq.headers,
    mayIncreaseDiskUsage: parsedTask.mayIncreaseDiskUsage,
    omitBody: parsedTask.omitBody,
    isContainer: parsedTask.isContainer,
    origin: parsedTask.origin,
    ldpTaskType: parsedTask.ldpTaskType,
    path: parsedTask.path,
    requestBody: parsedTask.requestBody
  })
  if (errorCode === null) {
    return parsedTask
  } else {
    throw new ErrorResult(ResultType.CouldNotParse)
  }
}

export class WacLdpTask {
  mayIncreaseDiskUsage: boolean
  isContainer: boolean
  omitBody: boolean
  asJsonLd: boolean
  origin: string | undefined
  contentType: string | undefined
  ifMatch: string | undefined
  ifNoneMatch: Array<string> | undefined
  ldpTaskType: TaskType
  path: Path
  requestBody: string
}
