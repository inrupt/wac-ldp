
import { fromStream, toStream, ResourceData } from '../../../src/lib/util/ResourceDataUtils'

test('toStream -> fromStream', async () => {
  const obj = { foo: 'bar' }
  const stream = toStream(obj)
  const readBack = await fromStream(stream)
  expect(readBack).toEqual(obj)
})
