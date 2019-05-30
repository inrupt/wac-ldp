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

  const ldpRs2 = fs.readFileSync('test/fixtures/ldpRs2.ttl')
  const ldpRs2Data = await objectToStream(makeResourceData('text/turtle', ldpRs2.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/ldp-rs2.ttl'))).setData(ldpRs2Data)
})

const handler = makeHandler(storage, 'http://localhost:8080', new URL('wss://localhost:8080'), false)

test('handles a GET /* request (glob read)', async () => {
  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-2-merge.ttl').toString()
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io'
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/*' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.end.mock.calls).toEqual([
    [ expectedTurtle ]
  ])
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      200,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Content-Type': 'text/turtle',
        'ETag': '"nTlfytRKUogadLYNnvpYjQ=="',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type", <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        'Updates-Via': 'wss://localhost:8080/'
      }
    ]
  ])
})
