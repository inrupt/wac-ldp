import { WacLdp } from '../../../src/lib/core/WacLdp'
import { BlobTree } from '../../../src/lib/storage/BlobTree'
import { BufferTree } from '../../../src/lib/storage/BufferTree'

export function makeHandler (blobTree: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean, idpHost: string, usesHttps: boolean) {
  const storage = new BufferTree(blobTree)
  const wacLdp = new WacLdp({ storage, aud, updatesViaUrl, skipWac, idpHost, usesHttps })
  return wacLdp.handler.bind(wacLdp)
}
