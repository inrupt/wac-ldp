import * as fs from 'fs'
import { readAcl } from '../../../src/lib/auth/readAcl'
import { Path, BlobTree } from '../../../src/lib/storage/BlobTree'
import { toChunkStream } from '../helpers/toChunkStream'

const aclDocTxt = fs.readFileSync('test/fixtures/aclDoc.ttl')

const storage = {
  getBlob: jest.fn(() => {
    return {
      getData: jest.fn(() => {
        return toChunkStream(JSON.stringify({
          contentType: 'text/turtle',
          body: aclDocTxt.toString(),
          etag: '"foo"'
        }))
      }),
      exists: jest.fn(() => {
        return true
      })
    }
  })
}

const path = new Path(['root', 'foo', 'bar'])

test('reads an ACL doc', async () => {
  const dataset = await readAcl(path, storage as unknown as BlobTree)
  const quads = []
  dataset.forEach((quad) => {
    quads.push(quad.toString())
  })
  expect(quads).toEqual([
    '<#owner> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.inrupt.net/profile/card#me> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#agent> <mailto:michiel@unhosted.org> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#accessTo> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#defaultForNew> </> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .',
    '<#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .'
  ])

})
