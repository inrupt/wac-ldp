import convert from 'buffer-to-stream'
import { calculateETag } from '../util/calculateETag'
import MIMEType from 'whatwg-mimetype'
import Debug from 'debug'
import { Member } from '../storage/Container'
import { Quad } from './StoreManager';

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

export enum ResourceType {
  Missing,
  LdpBc,
  LdpRsNonContainer,
  LdpNr
}
export function exists (resourceData: ResourceData) {
  return (resourceData.resourceType !== ResourceType.Missing)
}
export function hasContentType (resourceData: ResourceData) {
  return (resourceData.resourceType === ResourceType.LdpNr)
}
export function hasEtag (resourceData: ResourceData) {
  return exists(resourceData)
}
export function canGetMembers (resourceData: ResourceData) {
  return (resourceData.resourceType === ResourceType.LdpBc)
}
export function canGetQuads (resourceData: ResourceData) {
  return ([ResourceType.LdpRsNonContainer, ResourceType.LdpBc].indexOf(resourceData.resourceType) !== -1)
}
export function canGetBody (resourceData: ResourceData) {
  return hasContentType(resourceData)
}

export interface ResourceData {
  resourceType: ResourceType
  contentType?: string
  etag?: string
  getMembers?: () => Promise<Array<Member>>
  getQuads?: () => ReadableStream<Quad>
  getBody?: () => ReadableStream<Buffer>
}
export interface ResourceDataMissing {
  resourceType: ResourceType
}
export interface ResourceDataLdpBc {
  resourceType: ResourceType
  etag: string
  getMembers: () => Promise<Array<Member>>
  getQuads: () => ReadableStream<Quad>
}
export interface ResourceDataLdpRsNonContainer {
  resourceType: ResourceType
  etag: string
  getQuads: () => ReadableStream<Quad>
}
export interface ResourceDataLdpNr {
  resourceType: ResourceType
  contentType: string
  etag: string
  getBody: () => ReadableStream<Buffer>
}

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
  debug(str)
  return JSON.parse(str)
}
