import { WacLdp } from '../../../src/lib/core/WacLdp'
import { BlobTree } from '../../../src/lib/storage/BlobTree'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'

export function makeHandler (blobTree: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean, idpHost: string, usesHttps: boolean) {
  const storage = new QuadAndBlobStore(blobTree)
  const wacLdp = new WacLdp({ storage, aud, updatesViaUrl, skipWac, idpHost, usesHttps })
  return wacLdp.handler.bind(wacLdp)
}
