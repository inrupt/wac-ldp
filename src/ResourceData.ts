import convert from 'buffer-to-stream'
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
export function toStream (obj: any): any {
  const buffer = Buffer.from(JSON.stringify(obj))
  return convert(buffer)
}

// Generic stream conversion function, not really related to ResourceData specifically, but included here for convenience
export async function fromStream (stream: any): Promise<any> {
  const bufs = []
  return new Promise(resolve => {
    stream.on('data', function (d) {
      bufs.push(d)
    })
    stream.on('end', function () {
      const str = Buffer.concat(bufs).toString()
      resolve(JSON.parse(str))
    })
  })

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
