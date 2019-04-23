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
  expect(dataset).toEqual({})

})
