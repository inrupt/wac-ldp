import * as fs from 'fs'
import * as http from 'http'
import { makeHandler, Path } from '../../src/lib/core/app'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, ResourceData, makeResourceData } from '../../src/lib/util/ResourceDataUtils'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc2.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(new Path(['root', 'public', '.acl'])).setData(publicContainerAclDocData)

  const ldpRs1 = fs.readFileSync('test/fixtures/ldpRs1.ttl')
  const ldpRs1Data = await objectToStream(makeResourceData('text/turtle', ldpRs1.toString()))
  await storage.getBlob(new Path(['root', 'public', 'ldp-rs1.ttl'])).setData(ldpRs1Data)

  const ldpRs2 = fs.readFileSync('test/fixtures/ldpRs2.ttl')
  const ldpRs2Data = await objectToStream(makeResourceData('text/turtle', ldpRs2.toString()))
  await storage.getBlob(new Path(['root', 'public', 'ldp-rs2.ttl'])).setData(ldpRs2Data)
})

const handler = makeHandler(storage, 'audience')

test.only('handles a GET /* request (glob read)', async () => {
  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-2-merge.ttl').toString()
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/*' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      200,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Content-Type': 'text/turtle',
        'ETag': '"1B2M2Y8AsgTpgAmY7PhCfg=="',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type", <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
      }
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ expectedTurtle ]
  ])
})
