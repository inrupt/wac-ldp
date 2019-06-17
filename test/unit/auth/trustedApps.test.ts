import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { appIsTrustedForMode, OriginCheckTask } from '../../../src/lib/auth/appIsTrustedForMode'
import { RdfLayer } from '../../../src/lib/rdf/RdfLayer'
import { ACL } from '../../../src/lib/rdf/rdf-constants'

function readFixture (filename: string): Promise<any> {
  const bodyStream = fs.createReadStream(filename)
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  return rdf.dataset().import(quadStream)

}
test('finds acl:trustedApps nodes and their modes for a given owners list', async () => {
  const task = {
    origin: 'https://pheyvaer.github.io',
    mode: ACL.Read,
    resourceOwners: [ new URL('https://michielbdejong.com/profile/card#me')]
  } as OriginCheckTask

  const rdfLayer: unknown = {
    fetchGraph: jest.fn(() => {
      return readFixture('test/fixtures/owner-profile.ttl')
    })
  }
  const result = await appIsTrustedForMode(task, rdfLayer as RdfLayer)
  expect(result).toEqual(true)
})
