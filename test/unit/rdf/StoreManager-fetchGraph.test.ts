import { StoreManager } from '../../../src/lib/rdf/StoreManager'
import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { urlToPath } from '../../../src/lib/storage/BlobTree'
import * as fs from 'fs'
import { makeResourceData, objectToStream } from '../../../src/lib/rdf/ResourceDataUtils'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'

test('can fetch a local graph', async () => {
  const storage = new QuadAndBlobStore(new BlobTreeInMem())
  const blob = storage.getBlob(new URL('https://example.com/profile/card'))
  const body: Buffer = await new Promise(resolve => fs.readFile('./test/fixtures/profile-card.ttl', (err, data) => {
    if (err) throw new Error('failed to read fixture')
    resolve(data)
  }))
  const resourceData = makeResourceData('text/turtle', body.toString())
  await blob.setData(await objectToStream(resourceData))
  const storeManager = new StoreManager('example.com', storage) 
  const graph = await storeManager.fetchGraph(new URL('https://example.com/profile/card'))
  expect(graph.length).toEqual(5)
})

test('can fetch a remote graph', async () => {
  const storage = new QuadAndBlobStore(new BlobTreeInMem())
  const storeManager = new StoreManager('example.com', storage)
  const graph = await storeManager.fetchGraph(new URL('https://michielbdejong.com/profile/card'))
  expect(graph.length).toEqual(5)
})

// test.only('gracefully errors about a corrupted remote graph', async () => {
//   const storage = new BlobTreeInMem()
//   const StoreManager = new StoreManager('example.com', storage)
//   const graph = await StoreManager.fetchGraph(new URL('https://michielbdejong.com/bla.txt'))
//   expect(graph.length).toEqual(5)
// })
