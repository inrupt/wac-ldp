import { getBearerToken } from '../../fixtures/bearerToken'
import { determineWebId } from '../../../src/lib/auth/determineWebId'

test('correctly reads webId from bearer token', async () => {
  const { bearerToken, expectedWebId } = getBearerToken(true)
  const webId = await determineWebId(bearerToken)
  expect(webId).toEqual(expectedWebId)
})

test('returns undefined if bearer token is truncated', async () => {
  const { bearerToken, expectedWebId } = getBearerToken(false)
  const webId = await determineWebId(bearerToken)
  expect(webId).toEqual(undefined)
})
