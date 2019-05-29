import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

const debug = Debug('options-handler')

export const optionsHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => {
    return (wacLdpTask.wacLdpTaskType === TaskType.getOptions)
  },
  handle: function (wacLdpTask: WacLdpTask) {
    return Promise.resolve({
      resultType: ResultType.OkayWithoutBody,
      resourceData: undefined,
      createdLocation: undefined,
      isContainer: wacLdpTask.isContainer
    })
  }
}
