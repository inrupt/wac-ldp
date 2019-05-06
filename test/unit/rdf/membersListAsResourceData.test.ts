
import { ResourceData, makeResourceData, RdfType } from '../../../src/lib/rdf/ResourceDataUtils'
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
      '<> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/1> .',
      '<> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/2> .',
      '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#BasicContainer> .'
    ].join('\n') + '\n',
    etag: 'NIS58zYf2nH1tEAffcLmfA==',
    rdfType: RdfType.Turtle
  })
})

test('asJsonLd', async () => {
  const resourceData: ResourceData = await membersListAsResourceData('https://example.com/foo/', membersList, true)
  expect(resourceData).toEqual({
    contentType: 'application/ld+json',
    body: JSON.stringify([
      {
        '@id': '',
        'http://www.w3.org/ns/ldp#contains': {
          '@id': 'https://example.com/foo/1'
        }
      },
      {
        '@id': '',
        'http://www.w3.org/ns/ldp#contains': {
          '@id': 'https://example.com/foo/2'
        }
      },
      {
        '@id': '',
        '@type': 'http://www.w3.org/ns/ldp#BasicContainer'
      }
    ]),
    etag: 'F/UZbx2Oyi7ABYk1kZa/ow==',
    rdfType: RdfType.JsonLd
  })
})
