import { getBearerToken } from '../../fixtures/bearerToken'
import { determineWebId } from '../../../src/lib/auth/determineWebId'

test('correctly reads webId from bearer token', async () => {
  const { bearerToken, expectedWebId, aud } = getBearerToken(true)
  const webId = await determineWebId(bearerToken, aud)
  expect(webId).toEqual(expectedWebId)
})

test('returns undefined if bearer token is truncated', async () => {
  const { bearerToken, expectedWebId, aud } = getBearerToken(true)
  const webId = await determineWebId(bearerToken.substring(0, 100), aud)
  expect(webId).toEqual(undefined)
})

test('returns undefined if aud is wrong', async () => {
  const { bearerToken, expectedWebId } = getBearerToken(true)
  const webId = await determineWebId(bearerToken, 'https://not-the-right-aud.com')
  expect(webId).toEqual(undefined)
})
