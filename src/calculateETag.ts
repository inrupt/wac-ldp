import * as crypto from 'crypto'

const secret = 'abcdefg'

export default function calculateETag (text: string) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(text)
  return hmac.digest('hex')
}
