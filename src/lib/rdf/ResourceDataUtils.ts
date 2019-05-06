import convert from 'buffer-to-stream'
import { calculateETag } from '../util/calculateETag'

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

// Generic stream conversion functions, not really related to ResourceData specifically, but included here for convenience
export function bufferToStream (buffer: Buffer): any {
  return convert(buffer)
}

export function objectToStream (obj: any): any {
  const buffer = Buffer.from(JSON.stringify(obj))
  return bufferToStream(buffer)
}

export async function streamToBuffer (stream: any): Promise<Buffer> {
  const bufs: Array<Buffer> = []
  return new Promise(resolve => {
    stream.on('data', function (d: Buffer) {
      bufs.push(d)
    })
    stream.on('end', function () {
      resolve(Buffer.concat(bufs))
    })
  })
}

export async function streamToObject (stream: any): Promise<any> {
  const buffer = await streamToBuffer(stream)
  const str = buffer.toString()
  return JSON.parse(str)
}
