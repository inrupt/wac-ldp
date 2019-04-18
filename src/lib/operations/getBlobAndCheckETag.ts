import { Path, BlobTree } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { fromStream } from '../util/ResourceDataUtils'
import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import Debug from 'debug'
const debug = Debug('getBlobAndCheckETag')

export async function getBlobAndCheckETag (ldpTask: WacLdpTask, storage: BlobTree): Promise<Blob> {
  const blob: Blob = storage.getBlob(ldpTask.path)
  const data = await blob.getData()
  debug(data, ldpTask)
  if (data) { // resource exists
    if (ldpTask.ifNoneMatchStar) { // If-None-Match: * -> resource should not exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const resourceData = await fromStream(data)
    if (ldpTask.ifMatch && resourceData.etag !== ldpTask.ifMatch) { // If-Match -> ETag should match
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    if (ldpTask.ifNoneMatchList && ldpTask.ifNoneMatchList.indexOf(resourceData.etag) !== -1) { // ETag in blacklist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  } else { // resource does not exist
    if (ldpTask.ifMatch) { // If-Match -> ETag should match so resource should first exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  }
  return blob
}
