
import { ResourceData, makeResourceData } from '../../../src/lib/rdf/ResourceDataUtils'
import { membersListAsResourceData } from '../../../src/lib/rdf/membersListAsResourceData'
import { Member } from '../../../src/lib/storage/Container'

const membersList: Array<Member> = [
  { name: '1', isContainer: false },
  { name: '2', isContainer: true }
]

test('asTurtle', async () => {
  const resourceData: ResourceData = await membersListAsResourceData('https://example.com/foo/', membersList, false)
  expect(resourceData).toEqual({
    contentType: 'text/turtle',
    body: [
      '<https://example.com/foo/> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/1> .',
      '<https://example.com/foo/> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/2> .'
    ].join('\n') + '\n',
    etag: 'NfmMi+TUwA4G37x4uBNEpA=='
  })
})

test('asJsonLd', async () => {
  const resourceData: ResourceData = await membersListAsResourceData('https://example.com/foo/', membersList, true)
  expect(resourceData).toEqual({
    contentType: 'application/ld+json',
    body: JSON.stringify([
      {
        '@id': 'https://example.com/foo/',
        'http://www.w3.org/ns/ldp#contains': {
          '@id': 'https://example.com/foo/1'
        }
      },
      {
        '@id': 'https://example.com/foo/',
        'http://www.w3.org/ns/ldp#contains': {
          '@id': 'https://example.com/foo/2'
        }
      }
    ]),
    etag: '6fS0Q9y5iobzWMXFWSSYjQ=='
  })
})
