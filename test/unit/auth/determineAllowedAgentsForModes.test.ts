import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { determineAllowedAgentsForModes, ModesCheckTask } from '../../../src/lib/auth/determineAllowedAgentsForModes'

test('finds acl:accessTo modes', async () => {
  const bodyStream = fs.createReadStream('test/fixtures/aclDoc-from-NSS.ttl')
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: ModesCheckTask = {
    aclGraph: dataset,
    resourceIsTarget: true,
    contextUrl: new URL('https://example.com'),
    targetUrl: new URL('https://example.com')
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    read: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    write: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    append: [],
    control: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org']
  })
})

test('finds acl:default modes', async () => {
  const bodyStream = fs.createReadStream('test/fixtures/aclDoc-from-NSS.ttl')
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: ModesCheckTask = {
    aclGraph: dataset,
    contextUrl: new URL('/.acl', 'https://example.com/'),
    targetUrl: new URL('/', 'https://example.com/'),
    resourceIsTarget: true
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    read: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    write: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    append: [],
    control: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org']
  })
})
// tests to add:
// * are resource paths always absolute URL on the domain? (e.g. '/public/')
// * should use a different aclDoc fixture for acl:accessTo and acl:default
// * agent groups

function testUrlFormat (format: string) {
  test(`finds acl:accessTo modes (${format})`, async () => {
    const bodyStream = fs.createReadStream(`test/fixtures/aclDoc-read-${format}.ttl`)
    let parser = new N3Parser({
      factory: rdf
    })
    let quadStream = parser.import(bodyStream)
    const dataset = await rdf.dataset().import(quadStream)
    const task: ModesCheckTask = {
      aclGraph: dataset,
      resourceIsTarget: false,
      targetUrl: new URL('https://example.com/public'),
      contextUrl: new URL('https://example.com/public/.acl')
    }
    const result = await determineAllowedAgentsForModes(task)
    expect(result).toEqual({
      read: ['http://xmlns.com/foaf/0.1/Agent'],
      write: [],
      append: [],
      control: []
    })
  })
}
testUrlFormat('full-url')
testUrlFormat('abs-path')
testUrlFormat('rel-path')
testUrlFormat('rel-path-with-dot')
testUrlFormat('rel-path-with-dot-and-trailing-slash')
testUrlFormat('rel-path-with-trailing-slash')
