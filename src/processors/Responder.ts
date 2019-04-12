import * as http from 'http'
import Debug from 'debug'
import Processor from './Processor'
import { ResourceData } from '../ResourceData'
const debug = Debug('ResponderAndReleaser')

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
  InternalServerError
}

export class ErrorResult extends Error {
  resultType: ResultType
  constructor (resultType: ResultType) {
    super('error result')
    this.resultType = resultType
  }
}
export class LdpResponse {
  resultType: ResultType
  resourceData: ResourceData | undefined
  createdLocation: string | undefined
  isContainer: boolean
  httpRes: http.ServerResponse
}

export class Responder implements Processor {
  async process (task: LdpResponse) {
    debug('ResponderAndReleaserTask!')

    const responses = {
      [ResultType.OkayWithBody]: {
        responseStatus: 200,
        responseBody: task.resourceData ? task.resourceData.body : ''
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
      [ResultType.InternalServerError]: {
        responseStatus: 500,
        responseBody: 'Internal server error'
      }
    }
    debug(task.resultType, responses)
    const responseStatus = responses[task.resultType].responseStatus
    const responseBody = responses[task.resultType].responseBody

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
    task.httpRes.writeHead(responseStatus, responseHeaders)
    task.httpRes.end(responseBody)
    task.httpRes.on('end', () => {
      debug('request completed')
    })
  }
}
