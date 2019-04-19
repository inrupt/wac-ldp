import jwt from 'jsonwebtoken'
import Debug from 'debug'
import fetch, { Response } from 'node-fetch'
import { URL } from 'url'

const debug = Debug('determineWebId')

function urlToDomain (urlStr: string): string {
  debug('constructing URL', urlStr)
  const url = new URL(urlStr)
  return url.host
}
async function getIssuerPubKey (domain: string) {
  debug('fetching', `https://${domain}/.well-known/openid-configuration`)
  const openIdConfigResponse: Response = await fetch(`https://${domain}/.well-known/openid-configuration`)
  debug('fetch result', openIdConfigResponse)
  const openIdConfig = await openIdConfigResponse.json()
  debug('fetching', openIdConfig.jwks_uri)
  const jwks = await fetch(openIdConfig.jwks_uri)
  debug('jwks', jwks)
  return jwks[0]
}

export async function determineWebId (bearerToken: string, audience: string): Promise<string | undefined> {
  try {
    debug('bearerToken before decoding', bearerToken)
    const payload: any = jwt.decode(bearerToken)
    debug('bearerToken payload after decoding', payload)

    const idToken = jwt.decode(payload.id_token)
    debug('decoded', idToken)
    const domain: string = urlToDomain(idToken.sub as string)
    const issuerPubKey = await getIssuerPubKey(domain)
    if (!issuerPubKey) {
      debug('could not determine issuer pub key', idToken)
      return
    }
    try {
      jwt.verify(bearerToken, issuerPubKey, { audience })
    } catch (error) {
      debug('verification failed', error.message)
      return
    }
    debug('payload.id_token after decoding and verifying', idToken)
    return idToken.sub
  } catch (error) {
    debug(error)
  }
}
