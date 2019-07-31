import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { StoreManager } from '../rdf/RdfLibStoreManager'
import { ResourceData } from '../storage/QuadAndBlobStore'

export async function getResourceDataAndCheckETag (wacLdpTask: WacLdpTask, storeManager: StoreManager): Promise<ResourceData> {
  const metaData = await storeManager.getResourceData(wacLdpTask.fullUrl())
  // See https://github.com/inrupt/wac-ldp/issues/114
  const resultTypeToUse = (wacLdpTask.isReadOperation() ? ResultType.NotModified : ResultType.PreconditionFailed)
  if (metaData.exists) {
    if (wacLdpTask.ifNoneMatchStar()) { // If-None-Match: * -> resource should not exist
      throw new ErrorResult(resultTypeToUse)
    }
    const ifMatch = wacLdpTask.ifMatch()
    if (ifMatch && metaData.etag !== ifMatch) { // If-Match -> ETag should match
      throw new ErrorResult(resultTypeToUse)
    }
    const ifNoneMatchList: Array<string> | undefined = wacLdpTask.ifNoneMatchList()
    if (ifNoneMatchList && ifNoneMatchList.indexOf(metaData.etag) !== -1) { // ETag in blacklist
      throw new ErrorResult(resultTypeToUse)
    }
  } else { // resource does not exist
    if (wacLdpTask.ifMatch()) { // If-Match -> ETag should match so resource should first exist
      throw new ErrorResult(resultTypeToUse)
    }
  }
  return metaData
}
