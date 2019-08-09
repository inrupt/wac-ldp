import convert from 'buffer-to-stream'
import { calculateETag } from '../util/calculateETag'
import MIMEType from 'whatwg-mimetype'
import Debug from 'debug'
import { Child, ResourceData } from '../storage/BufferTree'
import { Quad } from './StoreManager'

const debug = Debug('ResourceDataUtils')

export enum RdfType {
  JsonLd,
  Turtle,
  Unknown,
  NoPref
}

// valid combinations:
// case:     exists isContainer canGetQuads | contentType | getMembers getQuads getBody setQuads setBody
// missing    false false       false       |             |
// LDP-BC     true  true        true        |             | yes        yes      no      no       no
// LDP-RS     true  false       true        |             |            yes      yes     yes      yes
// LDP-NC     true  false       false       | yes         |                     yes     yes      yes

export function determineRdfType (contentType: string | undefined): RdfType {
  if (!contentType) {
    return RdfType.NoPref
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
        return RdfType.Unknown
    }
    debug({ rdfType, contentType, essence: mimeType.essence })
  } catch (e) {
    debug('error determining rdf type', e.message)
    return RdfType.Unknown
  }
}

export function makeResourceData (contentType: string, body: string): ResourceData {
  const bodyStream: ReadableStream<Buffer> = bufferToStream(Buffer.from(body))
  return {} as ResourceData
  //   resourceType: ResourceType.LdpRsNonContainer,
  //   contentType,
  //   getBody: () => bodyStream,
  //   etag: calculateETag(body)
  // }
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
  debug(str)
  return JSON.parse(str)
}
