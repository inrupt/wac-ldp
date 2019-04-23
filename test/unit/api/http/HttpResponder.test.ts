import * as http from 'http'
import { sendHttpResponse, WacLdpResponse, ResultType } from '../../../../src/lib/api/http/HttpResponder'
import { makeResourceData } from '../../../../src/lib/util/ResourceDataUtils'

test('should produce a http response', async () => {
  let responseTask: WacLdpResponse = {
    resultType: ResultType.OkayWithBody,
    resourceData: makeResourceData('content/type', 'bla bla bla'),
    createdLocation: undefined,
    isContainer: false
  }
  const res = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await sendHttpResponse(responseTask, res as unknown as http.ServerResponse)
  expect(res.writeHead.mock.calls).toEqual([
    [
      200,
      {
        'Accept-Patch': 'application/sparql-update',
        'Accept-Post': 'application/sparql-update',
        'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
        'Content-Type': 'content/type',
        'ETag': '"rxrYx2/aLkjqmu0pN+ly6g=="',
        'Link': '<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"',
      }
    ]
  ])
  expect(res.end.mock.calls).toEqual([
    [
      'bla bla bla'
    ]
  ])
})
