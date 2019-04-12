// import * as Stream from 'stream'
import calculateETag from './calculateETag'

export interface ResourceData {
  body: string
  contentType: string
  etag: string
}
export function makeResourceData (contentType: string, body: string): ResourceData {
  return {
    contentType,
    body,
    etag: calculateETag(body)
  }
}
