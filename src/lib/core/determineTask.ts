import { WacLdpTask, parseHttpRequest, TaskType } from '../api/http/HttpParser'
import uuid from 'uuid/v4'
import Debug from 'debug'
const debug = Debug('determineTask')

export async function determineTask (httpReq) {
  const wacLdpTask: WacLdpTask = await parseHttpRequest(httpReq)
  // convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
  if (wacLdpTask.wacLdpTaskType === TaskType.containerMemberAdd) {
    debug('converting', wacLdpTask)
    wacLdpTask.path = wacLdpTask.path.toChild(uuid())
    wacLdpTask.wacLdpTaskType = TaskType.blobWrite
    wacLdpTask.isContainer = false
    debug('converted', wacLdpTask)
  }
  debug('parsed', wacLdpTask)
  return wacLdpTask
}
