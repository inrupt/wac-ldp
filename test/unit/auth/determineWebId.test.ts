import { getBearerToken } from '../../fixtures/bearerToken'
import { determineWebIdAndOrigin } from '../../../src/lib/auth/determineWebIdAndOrigin'

import MockDate from 'mockdate'
beforeEach(() => {
  MockDate.set(1434319925275)
})
afterEach(() => {
  MockDate.reset()
})

test('correctly reads webId from bearer token', async () => {
  const { bearerToken, expectedWebId, aud } = getBearerToken(true)
  const { webId } = await determineWebIdAndOrigin(bearerToken, aud, undefined)
  expect(webId).toEqual(expectedWebId)
})

test('returns undefined if bearer token is truncated', async () => {
  const { bearerToken, expectedWebId, aud } = getBearerToken(true)
  const { webId } = await determineWebIdAndOrigin(bearerToken.substring(0, 100), aud, undefined)
  expect(webId).toEqual(undefined)
})

test('returns undefined if aud is wrong', async () => {
  const { bearerToken, expectedWebId } = getBearerToken(true)
  const { webId } = await determineWebIdAndOrigin(bearerToken, 'https://not-the-right-aud.com', undefined)
  expect(webId).toEqual(undefined)
})
