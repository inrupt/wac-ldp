import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { determineAllowedModesForAgent, AgentCheckTask } from '../../../src/lib/auth/determineAllowedModesForAgent'

test('finds acl:accessTo modes', async () => {
  const bodyStream = fs.createReadStream('test/fixtures/aclDoc1.ttl')
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: AgentCheckTask = {
    agent: 'https://michielbdejong.inrupt.net/profile/card#me',
    aclGraph: dataset,
    isAdjacent: true,
    resourcePath: '/'
  }
  const result = await determineAllowedModesForAgent(task)
  expect(result).toEqual({
    read: true,
    write: true,
    append: false,
    control: true
  })
})

test('finds acl:default modes', async () => {
  const bodyStream = fs.createReadStream('test/fixtures/aclDoc1.ttl')
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: AgentCheckTask = {
    agent: 'https://michielbdejong.inrupt.net/profile/card#me',
    aclGraph: dataset,
    isAdjacent: false,
    resourcePath: '/'
  }
  const result = await determineAllowedModesForAgent(task)
  expect(result).toEqual({
    read: true,
    write: true,
    append: false,
    control: true
  })
})
// tests to add:
// * are resource paths always absolute URL on the domain? (e.g. '/public/')
// * should use a different aclDoc fixture for acl:accessTo and acl:default
// * agent groups
