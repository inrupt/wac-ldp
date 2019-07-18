import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { appIsTrustedForMode, OriginCheckTask, getAppModes } from '../../../src/lib/auth/appIsTrustedForMode'
import { setAppModes } from '../../../src/lib/rdf/setAppModes'
import { RdfLayer } from '../../../src/lib/rdf/RdfLayer'
import { ACL } from '../../../src/lib/rdf/rdf-constants'
import { BlobTree } from '../../../src/lib/storage/BlobTree'
import { objectToStream, makeResourceData } from '../../../src/lib/rdf/ResourceDataUtils'

const OWNER_PROFILE_FIXTURE = 'test/fixtures/owner-profile.ttl'

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
      return readFixture(OWNER_PROFILE_FIXTURE)
    })
  }
  const result = await appIsTrustedForMode(task, rdfLayer as RdfLayer)
  expect(result).toEqual(true)
})

test('getTrustedAppModes', async () => {
  const rdfLayer: unknown = {
    fetchGraph: jest.fn(() => {
      return readFixture('test/fixtures/owner-profile.ttl')
    })
  }
  const modes = await getAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://pheyvaer.github.io', rdfLayer as RdfLayer)

  expect(JSON.stringify(modes)).toEqual(JSON.stringify([
    new URL('http://www.w3.org/ns/auth/acl#Append'),
    new URL('http://www.w3.org/ns/auth/acl#Read'),
    new URL('http://www.w3.org/ns/auth/acl#Write')
  ]))
})

test('setTrustedAppModes existing', async () => {
  const storage: unknown = {
    getBlob: jest.fn(() => {
      return {
        getData () {
          return new Promise((resolve, reject) => {
            fs.readFile(OWNER_PROFILE_FIXTURE, (err, data) => {
              if (err) {
                reject('fixture error')
              }
              resolve(objectToStream(makeResourceData('text/turtle', data.toString())))
            })
          })
        },
        setData: jest.fn(() => Promise.resolve())
      }
    })
  }
  const modes = [
    new URL('http://www.w3.org/ns/auth/acl#Append'),
    new URL('http://www.w3.org/ns/auth/acl#Control')
  ]
  await setAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://pheyvaer.github.io', modes, storage as BlobTree)
  const newModes = await getAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://pheyvaer.github.io', new RdfLayer('https://michielbdejong.com', storage as BlobTree))

  expect(newModes).toEqual([
    'http://www.w3.org/ns/auth/acl#Append',
    'http://www.w3.org/ns/auth/acl#Read',
    'http://www.w3.org/ns/auth/acl#Write',
    'http://www.w3.org/ns/auth/acl#Control'
  ])
})

test.only('setTrustedAppModes new', async () => {
  const storage: unknown = {
    getBlob: jest.fn(() => {
      return {
        getData () {
          return new Promise((resolve, reject) => {
            fs.readFile(OWNER_PROFILE_FIXTURE, (err, data) => {
              if (err) {
                reject('fixture error')
              }
              resolve(objectToStream(makeResourceData('text/turtle', data.toString())))
            })
          })
        },
        setData: jest.fn(() => Promise.resolve())
      }
    })
  }
  const modes = [
    new URL('http://www.w3.org/ns/auth/acl#Append'),
    new URL('http://www.w3.org/ns/auth/acl#Control')
  ]
  await setAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://other.com', modes, storage as BlobTree)
  const newModes = await getAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://other.com', new RdfLayer('https://michielbdejong.com', storage as BlobTree))
  expect(newModes).toEqual([
    'http://www.w3.org/ns/auth/acl#Append',
    'http://www.w3.org/ns/auth/acl#Read',
    'http://www.w3.org/ns/auth/acl#Write',
    'http://www.w3.org/ns/auth/acl#Control'
  ])
})
