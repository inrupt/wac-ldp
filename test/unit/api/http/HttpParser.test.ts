import * as http from 'http'
import { parseHttpRequest, WacLdpTask, TaskType } from '../../../../src/lib/api/http/HttpParser'
import { Path } from '../../../../src/lib/storage/BlobTree'
import { toStream } from '../../../../src/lib/util/ResourceDataUtils'

test('should parse a http request', async () => {
  let streamed = false
  let endCallback: () => void
  const request = {
    headers: {
      'authorization': 'Bearer the-bearer-token',
      'if-match': '"if-match-etag"',
      'if-none-match': '*'
    } as http.IncomingHttpHeaders,
    url: '/foo/bar' as string,
    method: 'DELETE',
    on: (eventName: string, callback: (chunk: string) => void) => {
      if (eventName === 'data') {
        callback('the-body')
        streamed = true
      }
      if (eventName === 'end') {
        endCallback = callback as () => void
      }
      if (streamed && endCallback) {
        endCallback()
      }
    }
  } as http.IncomingMessage

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
