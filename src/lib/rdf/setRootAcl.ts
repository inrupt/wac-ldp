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

// FIXME: it gets a bit weird here where on the one hand
// we don't want to expose knowledge of how ACLs work
// so that's why this function exists at this layer and
// not higher up, but at the same time we now have a situation
// where this layer needs to know that an inbox is public-append
// so that also feels like (part of) this function should be at
// a higher level
export async function setPublicAcl (storage: BlobTree, owner: URL, inboxUrl: URL, modeName: string) {
  let inboxUrlStr = inboxUrl.toString()
  if (inboxUrlStr.substr(-1) !== '/') {
    inboxUrlStr += '/'
  }
  const inboxAclUrl = new URL(inboxUrlStr + ACL_SUFFIX)

  const obj = makeResourceData('text/turtle', [
    `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
    `@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.`,
    `<#owner>`,
    `  a acl:Authorization;`,
    `  acl:agent <${owner.toString()}>;`,
    `  acl:accessTo <./>;`,
    `  acl:default <./>;`,
    `  acl:mode`,
    `    acl:Read, acl:Write, acl:Control.`,
    `<#public>`,
    `  a acl:Authorization;`,
    `  acl:agent foaf:Agent;`,
    `  acl:accessTo <./>;`,
    `  acl:default <./>;`,
    `  acl:mode`,
    `    acl:${modeName}.`
  ].join('\n'))
  const buffer = Buffer.from(JSON.stringify(obj))
  const blob = storage.getBlob(urlToPath(inboxAclUrl))
  await blob.setData(bufferToStream(buffer))
}
