import convert from 'buffer-to-stream'
import { calculateETag } from '../util/calculateETag'
import MIMEType from 'whatwg-mimetype'
import Debug from 'debug'

const debug = Debug('ResourceDataUtils')

export enum RdfType {
  JsonLd,
  Turtle
}

export interface ResourceData {
  body: string
  contentType: string
  etag: string
  rdfType: RdfType | undefined
}

export function determineRdfType (contentType: string | null): RdfType | undefined {
  if (!contentType) {
    return
  }
  let rdfType
  try {
    const mimeType = new MIMEType(contentType)
    switch (mimeType.essence) {
      case 'application/ld+json':
        return RdfType.JsonLd
        break
      case 'text/turtle':
        return RdfType.Turtle
        break
      default:
        debug('not an RDF content-type', contentType, mimeType.essence)
    }
    debug({ rdfType, contentType, essence: mimeType.essence })
  } catch (e) {
    debug('error determining rdf type', e.message)
    // return rdfType as undefined
  }
}

export function makeResourceData (contentType: string, body: string): ResourceData {
  return {
    contentType,
    body,
    etag: calculateETag(body),
    rdfType: determineRdfType(contentType)
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
  // debug(stream)
  // debug(stream._readableState.buffer.head.data.toString())
  const bufs: Array<Buffer> = []
  return new Promise(resolve => {
    stream.on('data', function (d: Buffer) {
      debug('got chunk', d)
      bufs.push(d)
    })
    debug('data event added')
    stream.on('end', function () {
      debug('got end')
      resolve(Buffer.concat(bufs))
    })
  })
}

export async function streamToObject (stream: any): Promise<any> {
  const buffer = await streamToBuffer(stream)
  const str = buffer.toString()
  return JSON.parse(str)
}
