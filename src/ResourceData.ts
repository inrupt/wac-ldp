import streamifier from 'streamifier'
import { calculateETag } from './lib/util/calculateETag'

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

// Generic stream conversion function, not really related to ResourceData specifically, but included here for convenience
export function toStream (obj: any): ReadableStream {
  const buffer = Buffer.from(JSON.stringify(obj))
  return streamifier.createReadStream(buffer)
}

// Generic stream conversion function, not really related to ResourceData specifically, but included here for convenience
export async function fromStream (stream: ReadableStream): Promise<any> {
  let readResult
  let str = ''
  let value
  const reader = stream.getReader()
  do {
    readResult = await reader.read()
    str += readResult.value
  } while (!readResult.done)
  let obj
  try {
    obj = JSON.parse(str)
  } catch (error) {
    throw new Error('string in stream is not JSON')
  }
  return obj
}
