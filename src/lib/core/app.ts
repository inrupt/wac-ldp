import * as http from 'http'
import Debug from 'debug'
import { BlobTree } from '../storage/BlobTree'
import { parseHttpRequest, WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'
import { executeTask } from './executeTask'
import { makeResourceData, bufferToStream } from '../rdf/ResourceDataUtils'

const debug = Debug('app')

export function makeHandler (storage: BlobTree, aud: string, skipWac: boolean) {
  const handle = async (httpReq: http.IncomingMessage, httpRes: http.ServerResponse) => {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    try {
      const wacLdpTask: WacLdpTask = await parseHttpRequest(aud, httpReq)
      response = await executeTask(wacLdpTask, aud, storage, skipWac)
    } catch (error) {
      debug('errored', error)
      response = error as WacLdpResponse
    }
    try {
      debug('response is', response)
      return sendHttpResponse(response, httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  return handle
}

export function makeRootAcl (owner: string): ReadableStream {
  const obj = makeResourceData('text/turtle', [
    `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
    `<#owner>`,
    `  a acl:Authorization;`,
    `  acl:agent <${owner}>;`,
    `  acl:accessTo </>;`,
    `  acl:default </>;`,
    `  acl:mode`,
    `    acl:Read, acl:Write, acl:Control.`
  ].join('\n'))
  const buffer = Buffer.from(JSON.stringify(obj))
  return bufferToStream(buffer)
}
export { checkAccess, AccessCheckTask } from './checkAccess'
export { determineWebId } from '../auth/determineWebId'
export { BlobTree, Path } from '../storage/BlobTree'
export { BlobTreeInMem } from '../storage/BlobTreeInMem'
export { TaskType } from '../api/http/HttpParser'
