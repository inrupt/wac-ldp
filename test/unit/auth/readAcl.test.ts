import * as fs from 'fs'
import { readAcl, ACL_SUFFIX } from '../../../src/lib/auth/readAcl'
import { Path, BlobTree } from '../../../src/lib/storage/BlobTree'
import { toChunkStream } from '../helpers/toChunkStream'

const aclDoc1Txt = fs.readFileSync('test/fixtures/aclDoc1.ttl')
const aclDoc2Txt = fs.readFileSync('test/fixtures/aclDoc2.ttl')
const aclDoc3Txt = fs.readFileSync('test/fixtures/aclDoc3.ttl')
const aclDoc4Txt = fs.readFileSync('test/fixtures/aclDoc4.ttl')

const kv = {
  'root/foo/.acl': aclDoc1Txt.toString(),
  'root/foo/moo.acl': aclDoc2Txt.toString(),
  'root/foo/bar/.acl': aclDoc3Txt.toString(),
  'root/foo/bar/baz.acl': aclDoc4Txt.toString()
}

const storage = {
  getBlob: jest.fn((path) => {
    return {
      getData: jest.fn(() => {
        return toChunkStream(JSON.stringify({
          contentType: 'text/turtle',
          body: kv[path],
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
  ]
}

afterEach(() => {
  storage.getBlob.mock.calls = []
})

test('reads an adjacent ACL doc for a container', async () => {
  const path = new Path(['root', 'foo', 'bar'])
  const dataset = await readAcl(path, true, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'bar', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/bar/.acl'])

})

test('reads an adjacent ACL doc for a non-container', async () => {
  const path = new Path(['root', 'foo', 'moo'])
  const dataset = await readAcl(path, false, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'moo.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/moo.acl'])
})

test('falls back to parent ACL doc for a container', async () => {
  const path = new Path(['root', 'foo', 'yes'])
  const dataset = await readAcl(path, true, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
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
  const dataset = await readAcl(path, false, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
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
  const dataset = await readAcl(path, true, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
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
  const dataset = await readAcl(path, false, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
    quads.push(quad.toString())
  })
  expect(storage.getBlob.mock.calls).toEqual([
    [ new Path(['root', 'foo', 'moo', 'no.acl']) ],
    [ new Path(['root', 'foo', 'moo', '.acl']) ],
    [ new Path(['root', 'foo', '.acl']) ]
  ])
  expect(quads).toEqual(quadsExpected['root/foo/.acl'])
})
