import * as http from 'http'
import Debug from 'debug'
import { ResourceData } from '../../util/ResourceDataUtils'
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
export class WacLdpResponse {
  resultType: ResultType
  resourceData: ResourceData | undefined
  createdLocation: string | undefined
  isContainer: boolean
}

const responses = {
  [ResultType.OkayWithBody]: {
    responseStatus: 200
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
}

export async function sendHttpResponse (task: WacLdpResponse, httpRes: http.ServerResponse) {
  debug('sendHttpResponse!', task)

  debug(responses[task.resultType])
  const responseStatus = responses[task.resultType].responseStatus
  const responseBody = responses[task.resultType].responseBody || (task.resourceData ? task.resourceData.body : '')

  const types: Array<string> = [
    '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
  ]
  if (task.isContainer) {
    types.push('<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"')
  }
  const responseHeaders = {
    'Link': `<.acl>; rel="acl", <.meta>; rel="describedBy", ${types.join(', ')}`,
    'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Accept-Patch': 'application/sparql-update',
    'Accept-Post': 'application/sparql-update'
  } as any
  if (task.resourceData) {
    responseHeaders['Content-Type'] = task.resourceData.contentType
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
  httpRes.on('end', () => {
    debug('request completed')
  })
}
