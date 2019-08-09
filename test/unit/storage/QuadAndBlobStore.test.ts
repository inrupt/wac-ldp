import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { BufferTree } from '../../../src/lib/storage/BufferTree'

test('BufferTree', async () => {
  const store = new BufferTree(new BlobTreeInMem())
  // store.getBlob(new URL('http://example.com/asdf'))
  await store.getQuadStream(new URL('http://example.com/asdf'))
})
