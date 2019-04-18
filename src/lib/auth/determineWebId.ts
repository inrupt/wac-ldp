import jose from 'node-jose'
import jws from 'jws'
import jwt from 'jsonwebtoken'
import Debug from 'debug'

const debug = Debug('determineWebId')

export async function determineWebId (bearerToken: string): Promise<string> {
  try {
    debug('bearerToken before decoding', bearerToken)
    const decodedBearerToken = jws.decode(bearerToken)
    debug('bearerToken after decoding', decodedBearerToken)
    const payload = JSON.parse(decodedBearerToken.payload)
    debug('JSON-parsed payload in the decoded bearer token', payload)
    const idToken = jwt.decode(payload.id_token)
    debug('payload.id_token after decoding', idToken)
    // TODO: verify signature!
    debug('skipped signature checking for now; returning idToken.sub')
    return idToken.sub
  } catch (error) {
    debug(error)
  }
}
