import { WacLdp } from '../../../src/lib/core/WacLdp'
import { BlobTree } from '../../../src/lib/storage/BlobTree'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'
import { NssCompatResourceStore, DefaultOperationFactory, AclBasedAuthorizer } from '../../../src/exports'

export function makeHandler (blobTree: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean, idpHost: string, usesHttps: boolean) {
  const storage = new QuadAndBlobStore(blobTree)
  const resourceStore = new NssCompatResourceStore()
  const operationFactory = new DefaultOperationFactory(resourceStore)
  const authorizer = new AclBasedAuthorizer(resourceStore)
  const wacLdp = new WacLdp(operationFactory, authorizer, { storage, aud, updatesViaUrl, skipWac, idpHost, usesHttps })
  return wacLdp.handler.bind(wacLdp)
}
