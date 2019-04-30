import * as http from 'http'
import { makeHandler } from '../../src/lib/core/app'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'

const storage = new BlobTreeInMem()

const handler = makeHandler(storage, 'audience')

test('handles a GET request for a public resource', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/bar' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      404,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
      }
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    ['Not found']
  ])
})

test('handles a GET request for a private resource', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/private/bar' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      401,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
      }
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    ['Access denied']
  ])
})
