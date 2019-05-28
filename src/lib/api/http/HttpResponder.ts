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
  resultType: ResultType
  resourceData: ResourceData | undefined
  createdLocation: string | undefined
  isContainer: boolean
}

type ResponseContent = { responseStatus: number, responseBody: string | undefined }
type Responses = { [resultType in keyof typeof ResultType]: ResponseContent }

const responses: Responses = {
  [ResultType.OkayWithBody]: {
    responseStatus: 200,
    responseBody: undefined
  },
  [ResultType.CouldNotParse]: {
    responseStatus: 405,
    responseBody: 'Method not allowed'
  },
  [ResultType.AccessDenied]: {
    responseStatus: 401,
    responseBody: 'Access denied'
  },
  [ResultType.PreconditionFailed]: {
    responseStatus: 412,
    responseBody: 'Precondition failed'
  },
  [ResultType.NotFound]: {
    responseStatus: 404,
    responseBody: 'Not found'
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
    responseBody: 'Method not allowed'},
  [ResultType.InternalServerError]: {
    responseStatus: 500,
    responseBody: 'Internal server error'
  }
} as unknown as Responses

export async function sendHttpResponse (task: WacLdpResponse, updatesVia: URL, httpRes: http.ServerResponse) {
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
  const responseHeaders = {
    'Link': `<.acl>; rel="acl", <.meta>; rel="describedBy", ${types.join(', ')}`,
    'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Accept-Patch': 'application/sparql-update',
    'Accept-Post': 'application/sparql-update',
    'Updates-Via': updatesVia.toString()
  } as any
  if (task.resourceData) {
    responseHeaders['Content-Type'] = task.resourceData.contentType
  } else {
    responseHeaders['Content-Type'] = 'text/plain'
  }
  if (task.createdLocation) {
    responseHeaders['Location'] = task.createdLocation
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
