import jwt from 'jsonwebtoken'
import Debug from 'debug'
import fetch, { Response } from 'node-fetch'
import RSA from 'node-rsa'
import { URL } from 'url'

const debug = Debug('determineWebId')

function urlToDomain (urlStr: string): string {
  debug('constructing URL', urlStr)
  const url = new URL(urlStr)
  return url.host
}
async function getIssuerPubKey (domain: string): Promise<any> {
  debug('fetching', `https://${domain}/.well-known/openid-configuration`)
  const openIdConfigResponse: Response = await fetch(`https://${domain}/.well-known/openid-configuration`)
  const openIdConfig = await openIdConfigResponse.json()
  debug('openIdConfig', openIdConfig)
  debug('fetching', openIdConfig.jwks_uri)
  const jwksResponse = await fetch(openIdConfig.jwks_uri)
  const jwks = await jwksResponse.json()
  debug('jwks', jwks)

  const pubKeyComponents = {
    e: Buffer.from(jwks.keys[0].e, 'base64'),
    n: Buffer.from(jwks.keys[0].n, 'base64')
  }
  debug('pubKeyComponents', pubKeyComponents)
  const rsaPubKey: RSA = new RSA()
  rsaPubKey.importKey(pubKeyComponents, 'components-public')
  const publicPem: string = rsaPubKey.exportKey('pkcs1-public-pem')
  debug('publicPem', publicPem)
  return publicPem
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
      // todo: convert JWK to X5C
      debug('verifying bearerToken', issuerPubKey, audience)
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
