import { StoreManager } from '../../../src/lib/rdf/StoreManager'
import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { urlToPath } from '../../../src/lib/storage/BlobTree'
import * as fs from 'fs'
import { makeResourceData, objectToStream } from '../../../src/lib/rdf/ResourceDataUtils'
import { BufferTree } from '../../../src/lib/storage/BufferTree'

test('can fetch a local graph', async () => {
  const storage = new BufferTree(new BlobTreeInMem())
  const body: Buffer = await new Promise(resolve => fs.readFile('./test/fixtures/profile-card.ttl', (err, data) => {
    if (err) throw new Error('failed to read fixture')
    resolve(data)
  }))
  const resourceData = makeResourceData('text/turtle', body.toString())
  await storage.setData(new URL('https://example.com/profile/card'), await objectToStream(resourceData))
  const storeManager = new StoreManager('example.com', storage)
  const representation = await storeManager.getRepresentation(new URL('https://example.com/profile/card'))
  expect(representation).toEqual({
    body: `\n\
@prefix : <https://michielbdejong.com/profile/card#>.\n\
@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\
\n\
:me\n\
    acl:trustedApp\n\
            [\n\
                acl:mode acl:Append, acl:Read, acl:Write;\n\
                acl:origin <https://pheyvaer.github.io>\n\
            ].`,
    contentType: 'text/turtle',
    etag: '2degybTzzuuAYnGNtHV26A==',
    rdfType: 1
  })
})

test('can fetch a remote graph', async () => {
  const storage = new BufferTree(new BlobTreeInMem())
  const storeManager = new StoreManager('example.com', storage)
  const representation = await storeManager.getRepresentation(new URL('https://michielbdejong.com/profile/card'))
  expect(representation).toEqual({
    body: `\n\
@prefix : <https://michielbdejong.com/profile/card#>.\n\
@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\
\n\
:me\n\
    acl:trustedApp\n\
            [\n\
                acl:mode acl:Append, acl:Read, acl:Write;\n\
                acl:origin <https://pheyvaer.github.io>\n\
            ].`,
    contentType: 'text/turtle',
    etag: undefined,
    rdfType: 1
  })
})

// test('gracefully errors about a corrupted remote graph', async () => {
//   const storage = new BlobTreeInMem()
//   const StoreManager = new StoreManager('example.com', storage)
//   const graph = await StoreManager.fetchGraph(new URL('https://michielbdejong.com/bla.txt'))
//   expect(graph.length).toEqual(5)
// })
