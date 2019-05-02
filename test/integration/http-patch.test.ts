import * as fs from 'fs'
import * as http from 'http'
import { makeHandler, Path } from '../../src/lib/core/app'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, ResourceData, makeResourceData, streamToObject } from '../../src/lib/util/ResourceDataUtils'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc3.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(new Path(['root', 'public', '.acl'])).setData(publicContainerAclDocData)

  const ldpRs1 = fs.readFileSync('test/fixtures/ldpRs1.ttl')
  const ldpRs1Data = await objectToStream(makeResourceData('text/turtle', ldpRs1.toString()))
  await storage.getBlob(new Path(['root', 'public', 'ldp-rs1.ttl'])).setData(ldpRs1Data)
})

const handler = makeHandler(storage, 'http://localhost:8080', true)

test('handles a PATCH request', async () => {
  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-2-merge-alt.ttl').toString()
  const patchText = fs.readFileSync('test/fixtures/ldpRs2-as-patch.ttl').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream(patchText)
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/ldp-rs1.ttl' as string
  httpReq.method = 'PATCH'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      204,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
      }
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ 'No Content' ]
  ])
  const result = await storage.getBlob(new Path(['root', 'public', 'ldp-rs1.ttl'])).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/turtle', expectedTurtle))
})
