import * as fs from 'fs'
import * as http from 'http'
import { makeHandler } from '../../src/lib/core/WacLdp'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, makeResourceData } from '../../src/lib/rdf/ResourceDataUtils'
import { urlToPath } from '../../src/lib/storage/BlobTree'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-read-rel-path-parent-container-with-owner.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/.acl'))).setData(publicContainerAclDocData)

  // src/__mocks__/node-fetch.ts will use test/fixtures/web/michielbdejong.com/443/profile/card
  // Which says origin https://pheyvaer.github.io is trusted by owner https://michielbdejong.com/profile/card#me

  const ldpRs1 = fs.readFileSync('test/fixtures/ldpRs1.ttl')
  const ldpRs1Data = await objectToStream(makeResourceData('text/turtle', ldpRs1.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/ldp-rs1.ttl'))).setData(ldpRs1Data)
})

const handler = makeHandler(storage, 'http://localhost:8080', new URL('wss://localhost:8080'), false, 'localhost:8443')

test('handles a SPARQL query in the GET query parameter', async () => {
  const sparqlQuery = fs.readFileSync('test/fixtures/get-query.sparql').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io'
  } as http.IncomingHttpHeaders
  httpReq.url = `/foo/ldp-rs1.ttl?query=${encodeURIComponent(sparqlQuery)}`
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
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Authorization, User, Location, Link, Vary, Last-Modified, ETag, Accept-Patch, Accept-Post, Updates-Via, Allow, WAC-Allow, Content-Length, WWW-Authenticate',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Content-Type': 'application/sparql+json',
        'ETag': '"fTeBCZUGRxPpeUUf4DpHFg=="',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"; <https://localhost:8443>; rel="http://openid.net/specs/connect/1.0/issuer"; <http://localhost:8080/.well-known/solid>; rel="service"',
        'Updates-Via': 'wss://localhost:8080/'
      }
    ]
  ])
})
