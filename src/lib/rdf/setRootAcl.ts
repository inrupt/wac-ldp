import { makeResourceData, bufferToStream } from './ResourceDataUtils'
import { ACL_SUFFIX } from './RdfLayer'
import { BlobTree, urlToPath } from '../storage/BlobTree'

// TODO: this should be a method on a CachingRdfLayer object,
// which has access to a `this.storage` variable rather than
// requiring that as an extra parameter. And it should also
// use the CachingRdfLayer object's knowledge of how to map
// URLs to storage paths
export async function setRootAcl (storage: BlobTree, owner: URL, storageOrigin: URL) {
  let hostString = storageOrigin.toString()
  if (hostString.substr(-1) !== '/') {
    hostString += '/'
  }
  const rootAclUrl = new URL(hostString + ACL_SUFFIX)

  const obj = makeResourceData('text/turtle', [
    `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
    `<#owner>`,
    `  a acl:Authorization;`,
    `  acl:agent <${owner.toString()}>;`,
    `  acl:accessTo </>;`,
    `  acl:default </>;`,
    `  acl:mode`,
    `    acl:Read, acl:Write, acl:Control.`
  ].join('\n'))
  const buffer = Buffer.from(JSON.stringify(obj))
  const blob = storage.getBlob(urlToPath(rootAclUrl))
  await blob.setData(bufferToStream(buffer))
}
