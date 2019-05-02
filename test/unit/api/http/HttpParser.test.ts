import * as http from 'http'
import { parseHttpRequest, WacLdpTask, TaskType } from '../../../../src/lib/api/http/HttpParser'
import { Path } from '../../../../src/lib/storage/BlobTree'
import { bufferToStream } from '../../../../src/lib/util/ResourceDataUtils'
import { toChunkStream } from '../../helpers/toChunkStream'

test('should parse a http request with Bearer token', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'authorization': 'Bearer the-bearer-token'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = await parseHttpRequest('http://localhost:8080', request)
  expect(parsed).toEqual({
    asJsonLd: false,
    bearerToken: 'the-bearer-token',
    contentType: undefined,
    ifMatch: undefined,
    ifNoneMatchList: undefined,
    ifNoneMatchStar: false,
    isContainer: false,
    omitBody: false,
    origin: undefined,
    path: new Path(['root', 'foo', 'bar']),
    fullUrl: 'http://localhost:8080/foo/bar',
    requestBody: '',
    wacLdpTaskType: TaskType.blobDelete
  } as WacLdpTask)
})

test('should parse a http request with If-None-Match: * header', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'if-none-match': '*'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = await parseHttpRequest('http://localhost:8080', request)
  expect(parsed).toEqual({
    asJsonLd: false,
    bearerToken: undefined,
    contentType: undefined,
    ifMatch: undefined,
    ifNoneMatchList: undefined,
    ifNoneMatchStar: true,
    isContainer: false,
    omitBody: false,
    origin: undefined,
    path: new Path(['root', 'foo', 'bar']),
    fullUrl: 'http://localhost:8080/foo/bar',
    requestBody: '',
    wacLdpTaskType: TaskType.blobDelete
  } as WacLdpTask)
})

test('should parse a http request with If-None-Match: [list] header', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'if-none-match': '"etag-1", "etag-2"'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = await parseHttpRequest('http://localhost:8080', request)
  expect(parsed).toEqual({
    asJsonLd: false,
    bearerToken: undefined,
    contentType: undefined,
    ifMatch: undefined,
    ifNoneMatchList: ['etag-1', 'etag-2'],
    ifNoneMatchStar: false,
    isContainer: false,
    omitBody: false,
    origin: undefined,
    path: new Path(['root', 'foo', 'bar']),
    fullUrl: 'http://localhost:8080/foo/bar',
    requestBody: '',
    wacLdpTaskType: TaskType.blobDelete
  } as WacLdpTask)
})

test('should parse a http request with If-Match header', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'if-match': '"if-match-etag"'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = await parseHttpRequest('http://localhost:8080', request)
  expect(parsed).toEqual({
    asJsonLd: false,
    bearerToken: undefined,
    contentType: undefined,
    ifMatch: 'if-match-etag',
    ifNoneMatchList: undefined,
    ifNoneMatchStar: false,
    isContainer: false,
    omitBody: false,
    origin: undefined,
    path: new Path(['root', 'foo', 'bar']),
    fullUrl: 'http://localhost:8080/foo/bar',
    requestBody: '',
    wacLdpTaskType: TaskType.blobDelete
  } as WacLdpTask)
})
