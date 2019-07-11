import { RdfLayer } from '../../../src/lib/rdf/RdfLayer'
import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { urlToPath } from '../../../src/lib/storage/BlobTree'
import * as fs from 'fs'
import { makeResourceData, objectToStream } from '../../../src/lib/rdf/ResourceDataUtils'

test('can fetch a local graph', async () => {
  const storage = new BlobTreeInMem()
  const blob = storage.getBlob(urlToPath(new URL('https://example.com/profile/card')))
  const body: Buffer = await new Promise(resolve => fs.readFile('./test/fixtures/profile-card.ttl', (err, data) => {
    if (err) throw new Error('failed to read fixture')
    resolve(data)
  }))
  const resourceData = makeResourceData('text/turtle', body.toString())
  await blob.setData(await objectToStream(resourceData))
  const rdfLayer = new RdfLayer('example.com', storage)
  const graph = await rdfLayer.fetchGraph(new URL('https://example.com/profile/card'))
  expect(graph.length).toEqual(5)
})

test('can fetch a remote graph', async () => {
  const storage = new BlobTreeInMem()
  const rdfLayer = new RdfLayer('example.com', storage)
  const graph = await rdfLayer.fetchGraph(new URL('https://michielbdejong.com/profile/card'))
  expect(graph.length).toEqual(5)
})
