import * as fs from 'fs'
import { readAcl, ACL_SUFFIX } from '../../../src/lib/auth/readAcl'
import { Path, BlobTree } from '../../../src/lib/storage/BlobTree'
import { toChunkStream } from '../helpers/toChunkStream'
import { RdfType } from '../../../src/lib/rdf/ResourceDataUtils';

const aclDoc1Turtle = fs.readFileSync('test/fixtures/aclDoc-from-NSS.ttl')
const aclDoc1Json = fs.readFileSync('test/fixtures/aclDoc-from-NSS.json')

// FIXME: use different ACL docs and test different situations here:
const kv: {[pathStr: string]: { rdfType: RdfType, body: string } } = {
  'root/foo/.acl': { rdfType: RdfType.Turtle, body: aclDoc1Turtle.toString() },
  'root/foo/moo.acl': { rdfType: RdfType.Turtle, body: aclDoc1Turtle.toString() },
  'root/foo/bar/.acl': { rdfType: RdfType.Turtle, body: aclDoc1Turtle.toString() },
  'root/foo/bar/baz.acl': { rdfType: RdfType.Turtle, body: aclDoc1Turtle.toString() },
  'root/foo/jay/.acl': { rdfType: RdfType.JsonLd, body: aclDoc1Json.toString() }
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

const quadsExpected = {
  'root/foo/.acl': [
    '<#owner> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'root/foo/bar/.acl': [
    '<#owner> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'root/foo/bar/baz.acl': [
    '<#owner> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'root/foo/moo.acl': [
    '<#owner> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#default> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ],
  'root/foo/jay/.acl': [
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
  const path = new Path(['root', 'foo', 'bar'])
  let { aclGraph, topicPath, isAdjacent } = await readAcl(path, true, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'bar', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/bar/.acl'])

})

test('reads an adjacent ACL doc for a container (JSON-LD))', async () => {
  const path = new Path(['root', 'foo', 'jay'])
  let { aclGraph, topicPath, isAdjacent } = await readAcl(path, true, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'jay', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/jay/.acl'])

})

test('reads an adjacent ACL doc for a non-container', async () => {
  const path = new Path(['root', 'foo', 'moo'])
  const { aclGraph, topicPath, isAdjacent } = await readAcl(path, false, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'moo.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/moo.acl'])
})

test('falls back to parent ACL doc for a container', async () => {
  const path = new Path(['root', 'foo', 'yes'])
  const { aclGraph, topicPath, isAdjacent } = await readAcl(path, true, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'yes', '.acl']) ],
    [ new Path(['root', 'foo', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/.acl'])
})

test('falls back to container ACL doc for a non-container', async () => {
  const path = new Path(['root', 'foo', 'no'])
  const { aclGraph, topicPath, isAdjacent } = await readAcl(path, false, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'no.acl']) ],
    [ new Path(['root', 'foo', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/.acl'])
})

test('falls back to ancestor ACL doc for a container', async () => {
  const path = new Path(['root', 'foo', 'moo', 'yes'])
  const { aclGraph, topicPath, isAdjacent } = await readAcl(path, true, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'moo', 'yes', '.acl']) ],
    [ new Path(['root', 'foo', 'moo', '.acl']) ],
    [ new Path(['root', 'foo', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/.acl'])
})

test('falls back to ancestor ACL doc for a non-container', async () => {
  const path = new Path(['root', 'foo', 'moo', 'no'])
  const { aclGraph, topicPath, isAdjacent } = await readAcl(path, false, storage as unknown as BlobTree)
  const quads: Array<string> = []
  aclGraph.forEach((quad: string) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'moo', 'no.acl']) ],
    [ new Path(['root', 'foo', 'moo', '.acl']) ],
    [ new Path(['root', 'foo', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/.acl'])
})
