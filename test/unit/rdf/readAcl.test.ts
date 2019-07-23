import * as fs from 'fs'
import { RdfLayer } from '../../../src/lib/rdf/RdfLayer'
import { urlToPath } from '../../../src/lib/storage/BlobTree'
import { toChunkStream } from '../helpers/toChunkStream'
import { RdfType } from '../../../src/lib/rdf/ResourceDataUtils'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'

const aclDoc1Turtle = fs.readFileSync('test/fixtures/aclDoc-from-NSS-1.ttl')
const aclDoc2Turtle = fs.readFileSync('test/fixtures/aclDoc-from-NSS-2.ttl')
const aclDoc3Turtle = fs.readFileSync('test/fixtures/aclDoc-from-NSS-3.ttl')
const aclDoc4Turtle = fs.readFileSync('test/fixtures/aclDoc-from-NSS-4.ttl')
const aclDoc1Json = fs.readFileSync('test/fixtures/aclDoc-from-NSS.json')

const kv: {[pathStr: string]: { rdfType: RdfType, body: string } } = {
  'v1/localhost:8080/foo/.acl': { rdfType: RdfType.Turtle, body: aclDoc1Turtle.toString() },
  'v1/localhost:8080/foo/bar/.acl': { rdfType: RdfType.Turtle, body: aclDoc2Turtle.toString() },
  'v1/localhost:8080/foo/bar/baz.acl': { rdfType: RdfType.Turtle, body: aclDoc3Turtle.toString() },
  'v1/localhost:8080/foo/moo.acl': { rdfType: RdfType.Turtle, body: aclDoc4Turtle.toString() },
  'v1/localhost:8080/foo/jay/.acl': { rdfType: RdfType.JsonLd, body: aclDoc1Json.toString() }
}

const storage = {
  getBlob: jest.fn((path) => {
    return {
      getData: jest.fn(() => {
        return toChunkStream(JSON.stringify({
          rdfType: kv[path].rdfType,
          body: kv[path].body,
          etag: '"foo"'
        }))
      }),
      exists: jest.fn(() => {
        return (typeof kv[path] !== 'undefined')
      })
    }
  })
}
const rdfLayer = new RdfLayer('https://localhost:8080', storage as unknown as QuadAndBlobStore)

const quadsExpected = {
  'v1/localhost:8080/foo/.acl': [
    '<#one> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#one> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#one> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#one> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#one> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#one> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#one> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#one> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'v1/localhost:8080/foo/bar/.acl': [
    '<#two> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#two> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#two> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#two> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#two> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#two> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#two> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#two> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'v1/localhost:8080/foo/bar/baz.acl': [
    '<#three> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#three> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#three> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#three> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#three> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#three> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#three> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#three> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'v1/localhost:8080/foo/moo.acl': [
    '<#four> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#four> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#four> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#four> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#four> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#four> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#four> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#four> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'v1/localhost:8080/foo/jay/.acl': [
    '_:b1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#accessTo> <https://example.org/> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#default> <https://example.org/> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '_:b1 <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ]
}

afterEach(() => {
  storage.getBlob.mock.calls = []
})

test('reads an adjacent ACL doc for a container (Turtle)', async () => {
  const url = new URL('https://localhost:8080/foo/bar/')
  let { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/bar/.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/bar/.acl'])

})

test('reads an adjacent ACL doc for a container (JSON-LD))', async () => {
  const url = new URL('https://localhost:8080/foo/jay/')
  let { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/jay/.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/jay/.acl'])

})

test('reads an adjacent ACL doc for a non-container', async () => {
  const url = new URL('https://localhost:8080/foo/bar/baz')
  const { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/bar/baz.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/bar/baz.acl'])
})

test('falls back to parent ACL doc for a container', async () => {
  const url = new URL('https://localhost:8080/foo/bar/no/')
  const { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/bar/no/.acl')) ],
    [ urlToPath(new URL('https://localhost:8080/foo/bar/.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/bar/.acl'])
})

test('falls back to container ACL doc for a non-container', async () => {
  const url = new URL('https://localhost:8080/foo/bar/no')
  const { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/bar/no.acl')) ],
    [ urlToPath(new URL('https://localhost:8080/foo/bar/.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/bar/.acl'])
})

test('falls back to ancestor ACL doc for a container', async () => {
  const url = new URL('https://localhost:8080/foo/no/no/')
  const { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/no/no/.acl')) ],
    [ urlToPath(new URL('https://localhost:8080/foo/no/.acl')) ],
    [ urlToPath(new URL('https://localhost:8080/foo/.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/.acl'])
})

test('falls back to ancestor ACL doc for a non-container', async () => {
  const url = new URL('https://localhost:8080/foo/no/no')
  const { aclGraph } = await rdfLayer.readAcl(url)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ urlToPath(new URL('https://localhost:8080/foo/no/no.acl')) ],
    [ urlToPath(new URL('https://localhost:8080/foo/no/.acl')) ],
    [ urlToPath(new URL('https://localhost:8080/foo/.acl')) ]
  ])
  expect(quads).toEqual(quadsExpected['v1/localhost:8080/foo/.acl'])
})
