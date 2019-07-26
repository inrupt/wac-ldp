import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { WacLdpTask } from '../api/http/HttpParser'
import { StoreManager } from '../rdf/StoreManager'
import { ResourceData } from '../rdf/ResourceDataUtils'

export async function getResourceDataAndCheckETag (wacLdpTask: WacLdpTask, storeManager: StoreManager): Promise<ResourceData | undefined> {
  const resourceData = await storeManager.getResourceData(wacLdpTask.fullUrl())
  if (resourceData) { // resource exists
    if (wacLdpTask.ifNoneMatchStar()) { // If-None-Match: * -> resource should not exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const ifMatch = wacLdpTask.ifMatch()
    if (ifMatch && resourceData.etag !== ifMatch) { // If-Match -> ETag should match
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
    const ifNoneMatchList: Array<string> | undefined = wacLdpTask.ifNoneMatchList()
    if (ifNoneMatchList && ifNoneMatchList.indexOf(resourceData.etag) !== -1) { // ETag in blacklist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  } else { // resource does not exist
    if (wacLdpTask.ifMatch()) { // If-Match -> ETag should match so resource should first exist
      throw new ErrorResult(ResultType.PreconditionFailed)
    }
  }
  return resourceData
}
