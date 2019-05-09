import * as fs from 'fs'
import * as http from 'http'
import { makeHandler, Path } from '../../src/lib/core/app'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, ResourceData, makeResourceData, streamToObject } from '../../src/lib/rdf/ResourceDataUtils'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-readwrite.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(new Path(['root', 'public', '.acl'])).setData(publicContainerAclDocData)

  const ldpRs1 = fs.readFileSync('test/fixtures/ldpRs1.ttl')
  const ldpRs1Data = await objectToStream(makeResourceData('text/turtle', ldpRs1.toString()))
  await storage.getBlob(new Path(['root', 'public', 'ldp-rs1.ttl'])).setData(ldpRs1Data)
})

const handler = makeHandler(storage, 'http://localhost:8080', false)

test('handles a SPARQL query in the GET query parameter', async () => {
  const sparqlQuery = fs.readFileSync('test/fixtures/get-query.sparql').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = `/public/ldp-rs1.ttl?query=${encodeURIComponent(sparqlQuery)}`
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.end.mock.calls).toEqual([
    [
      JSON.stringify({
        head: {
          vars: [ 'name' ]
        },
        results: {
          ordered: false,
          distinct: false,
          bindings: [
            {
              name: { 'type': 'literal', 'value': 'Green Goblin' }
            }
          ]
        }
      })
    ]
  ])
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      200,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Content-Type': 'application/sparql+json',
        'ETag': '"fTeBCZUGRxPpeUUf4DpHFg=="',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"'
      }
    ]
  ])
})
