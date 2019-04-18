import Debug from 'debug'
import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'

import { Path } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { ResourceData, makeResourceData } from '../util/ResourceDataUtils'

export const ACL_SUFFIX = '.acl'

async function getAclBlob (resourcePath: Path): Promise<ResourceData> {
  let currentGuessPath = resourcePath
  let currentGuessBlob = this.storage.getBlob(currentGuessPath.appendSuffix(ACL_SUFFIX))
  while (!currentGuessBlob.exists()) {
    currentGuessPath = currentGuessPath.toParent()
    if (!currentGuessPath) {
      // root ACL, nobody has access:
      return makeResourceData('text/turtle', '')
    }
    let currentGuessBlob = this.storage.getBlob(currentGuessPath.appendSuffix(ACL_SUFFIX))
  }
  return currentGuessBlob.getData()
}

export async function readAcl (resourcePath: Path) {
  const aclResourceData = await getAclBlob(resourcePath)
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(aclResourceData.body)
  const dataset = await rdf.dataset().import(quadStream)
  return dataset
}

 // Example ACL file, this one is on https://michielbdejong.inrupt.net/.acl:
//
// # Root ACL resource for the user account
// @prefix acl: <http://www.w3.org/ns/auth/acl#>.

 // <#owner>
//     a acl:Authorization;

 //     acl:agent <https://michielbdejong.inrupt.net/profile/card#me> ;

 //     # Optional owner email, to be used for account recovery:
//     acl:agent <mailto:michiel@unhosted.org>;

 //     # Set the access to the root storage folder itself
//     acl:accessTo </>;

 //     # All resources will inherit this authorization, by default
//     acl:defaultForNew </>;

 //     # The owner has all of the access modes allowed
//     acl:mode
//         acl:Read, acl:Write, acl:Control.

 // # Data is private by default; no other agents get access unless specifically
// # authorized in other .acls
