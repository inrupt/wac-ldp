import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { determineAllowedAgentsForModes, ModesCheckTask } from '../../../src/lib/auth/determineAllowedAgentsForModes'
import { RdfFetcher } from '../../../src/lib/rdf/RdfFetcher'

function readFixture (filename: string): Promise<any> {
  const bodyStream = fs.createReadStream(filename)
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  return rdf.dataset().import(quadStream)

}
test('finds acl:accessTo modes for local agent group', async () => {
  const dataset = await readFixture('test/fixtures/aclDoc-agent-group.ttl')
  const workGroupsGraph = await readFixture('test/fixtures/work-groups.ttl')
  const task: ModesCheckTask = {
    aclGraph: dataset,
    resourceIsTarget: true,
    contextUrl: new URL('https://example.com'),
    targetUrl: new URL('https://example.com'),
    rdfFetcher: {
      fetchGraph: jest.fn(() => {
        return workGroupsGraph
      })
    } as unknown as RdfFetcher
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    read: [],
    write: [],
    append: [
      new URL('https://bob.example.com/profile/card#me'),
      new URL('https://candice.example.com/profile/card#me'),
      new URL('https://deb.example.com/profile/card#me')
    ],
    control: []
  })
})
