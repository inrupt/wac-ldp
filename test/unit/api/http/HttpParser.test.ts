import * as http from 'http'
import { parseHttpRequest, WacLdpTask, TaskType } from '../../../../src/lib/api/http/HttpParser'
import { Path } from '../../../../src/lib/storage/BlobTree'
import { bufferToStream } from '../../../../src/lib/util/ResourceDataUtils'
import { toChunkStream } from '../../helpers/toChunkStream'

test('should parse a http request', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('the-body')
  request.headers = {
    'authorization': 'Bearer the-bearer-token',
    'if-match': '"if-match-etag"',
    'if-none-match': '*'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = await parseHttpRequest(request)
  expect(parsed).toEqual({
    asJsonLd: false,
    bearerToken: 'the-bearer-token',
    contentType: undefined,
    ifMatch: 'if-match-etag',
    ifNoneMatchList: undefined,
    ifNoneMatchStar: true,
    isContainer: false,
    omitBody: false,
    origin: undefined,
    path: new Path(['root', 'foo', 'bar']),
    requestBody: 'the-body',
    wacLdpTaskType: TaskType.blobDelete
  } as WacLdpTask)
})
