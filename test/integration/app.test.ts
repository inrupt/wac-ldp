import * as fs from 'fs'
import * as http from 'http'
import { makeHandler, Path } from '../../src/lib/core/app'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, ResourceData, makeResourceData } from '../../src/lib/rdf/ResourceDataUtils'
import { urlToPath } from '../../src/lib/storage/BlobTree'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-read-rel-path-parent-container.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/.acl'))).setData(publicContainerAclDocData)
})

const handler = makeHandler(storage, 'http://localhost:8080', false)

test('handles a GET request for a public resource', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/foo/bar' as string
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
        'Content-Type': 'text/plain',
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
        'Content-Type': 'text/plain',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
      }
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    ['Access denied']
  ])
})
