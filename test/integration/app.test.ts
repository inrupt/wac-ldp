import * as http from 'http'
import { makeHandler } from '../../src/lib/core/app'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'

const storage = new BlobTreeInMem()

const handler = makeHandler(storage, 'audience')

test('handles a GET request', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('the-body')
  httpReq.headers = {
    'authorization': 'Bearer the-bearer-token',
    'if-match': '"if-match-etag"',
    'if-none-match': '*'
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/bar' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  } as unknown as http.ServerResponse
  await handler(httpReq, httpRes)
})
