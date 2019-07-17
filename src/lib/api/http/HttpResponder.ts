import * as http from 'http'
import Debug from 'debug'
import { ResourceData } from '../../rdf/ResourceDataUtils'
import { LDP } from '../../rdf/rdf-constants'
const debug = Debug('HttpResponder')

export enum ResultType {
  CouldNotParse,
  AccessDenied,
  PreconditionFailed,
  NotModified,
  NotFound,
  QuotaExceeded,
  OkayWithBody,
  OkayWithoutBody,
  Created,
  MethodNotAllowed,
  InternalServerError
}

export class ErrorResult extends Error {
  resultType: ResultType
  constructor (resultType: ResultType) {
    super('error result')
    this.resultType = resultType
  }
}
export interface WacLdpResponse {
  resourcesChanged?: Array<URL>
  resultType: ResultType
  resourceData?: ResourceData
  createdLocation?: URL
  isContainer: boolean
}

type ResponseContent = {
  responseStatus: number,
  responseBody?: string,
  constrainedBy?: string
}
type Responses = { [resultType in keyof typeof ResultType]: ResponseContent }

const responses: Responses = {
  [ResultType.OkayWithBody]: {
    responseStatus: 200,
    responseBody: undefined
  },
  [ResultType.CouldNotParse]: {
    responseStatus: 405,
    responseBody: 'Method not allowed',
    constrainedBy: 'could-not-parse'
  },
  [ResultType.AccessDenied]: {
    responseStatus: 401,
    responseBody: 'Access denied',
    constrainedBy: 'wac'
  },
  [ResultType.PreconditionFailed]: {
    responseStatus: 412,
    responseBody: 'Precondition failed',
    constrainedBy: 'conflict'
  },
  [ResultType.NotFound]: {
    responseStatus: 404,
    responseBody: 'Not found',
    constrainedBy: 'not-found'
  },
  [ResultType.NotModified]: {
    responseStatus: 304,
    responseBody: 'Not modified'
  },
  [ResultType.Created]: {
    responseStatus: 201,
    responseBody: 'Created'
  },
  [ResultType.OkayWithoutBody]: {
    responseStatus: 204,
    responseBody: 'No Content'
  },
  [ResultType.MethodNotAllowed]: {
    responseStatus: 405,
    responseBody: 'Method not allowed',
    constrainedBy: 'unknown-method'
  },
  [ResultType.InternalServerError]: {
    responseStatus: 500,
    responseBody: 'Internal server error'
  }
} as unknown as Responses

export async function sendHttpResponse (task: WacLdpResponse, options: { updatesVia: URL, storageOrigin: string | undefined, idpHost: string, originToAllow: string }, httpRes: http.ServerResponse) {
  debug('sendHttpResponse!', task)

  debug(responses[task.resultType])
  const responseStatus = responses[task.resultType].responseStatus
  const responseBody = responses[task.resultType].responseBody || (task.resourceData ? task.resourceData.body : '')

  const types: Array<string> = [
    `<${LDP.Resource}>; rel="type"`
  ]
  if (task.isContainer) {
    types.push(`<${LDP.BasicContainer}>; rel="type"`)
  }
  let links = `<.acl>; rel="acl", <.meta>; rel="describedBy", ${types.join(', ')}, <https://${options.idpHost}>; rel="http://openid.net/specs/connect/1.0/issuer"`
  if (options.storageOrigin) {
    links += `, <${options.storageOrigin}/.well-known/solid>; rel="service"`
  }
  if (responses[task.resultType].constrainedBy) {
    links += `, <http://www.w3.org/ns/ldp#constrainedBy-${responses[task.resultType].constrainedBy}>; rel="http://www.w3.org/ns/ldp#constrainedBy"`
  }

  const responseHeaders = {
    'Link':  links,
    'X-Powered-By': 'inrupt pod-server (alpha)',
    'Vary': 'Accept, Authorization, Origin',
    'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Accept-Patch': 'application/sparql-update',
    'Accept-Post': 'application/sparql-update',
    'Access-Control-Allow-Origin': options.originToAllow,
    'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type, Origin, Referer, X-Requested-With, Link, Slug',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'User, Location, Link, Vary, Last-Modified, ETag, Accept-Patch, Accept-Post, Updates-Via, Allow, WAC-Allow, Content-Length, WWW-Authenticate',
    'Updates-Via': options.updatesVia.toString()
  } as any
  if (task.resourceData) {
    responseHeaders['Content-Type'] = task.resourceData.contentType
  } else {
    responseHeaders['Content-Type'] = 'text/plain'
    // responseHeaders['Transfer-Encoding'] = 'chunked' // see https://github.com/solid/test-suite/issues/24
  }
  if (task.createdLocation) {
    responseHeaders['Location'] = task.createdLocation.toString()
  }
  if (task.resultType === ResultType.AccessDenied) {
    responseHeaders['WWW-Authenticate'] = `Bearer realm="${options.storageOrigin}", scope="openid webid"`
  }
  if (task.resourceData) {
    debug('setting ETag')
    responseHeaders.ETag = `"${task.resourceData.etag}"`
  } else {
    debug('not setting ETag')
  }

  debug('responding', { responseStatus, responseHeaders, responseBody })
  httpRes.writeHead(responseStatus, responseHeaders)
  httpRes.end(responseBody)
}
