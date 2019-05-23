import { makeResourceData, bufferToStream } from './ResourceDataUtils'
import { ACL_SUFFIX } from '../rdf/RdfFetcher'
import { Path, BlobTree } from '../storage/BlobTree'

export async function setRootAcl (storage: BlobTree, owner: string) {
  const obj = makeResourceData('text/turtle', [
    `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
    `<#owner>`,
    `  a acl:Authorization;`,
    `  acl:agent <${owner}>;`,
    `  acl:accessTo </>;`,
    `  acl:default </>;`,
    `  acl:mode`,
    `    acl:Read, acl:Write, acl:Control.`
  ].join('\n'))
  const buffer = Buffer.from(JSON.stringify(obj))
  const blob = storage.getBlob(new Path(['root', ACL_SUFFIX]))
  await blob.setData(bufferToStream(buffer))
}
