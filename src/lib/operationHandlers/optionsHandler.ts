import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'
import { RdfLayer } from '../rdf/RdfLayer'

const debug = Debug('options-handler')

export const optionsHandler = {
  canHandle: (wacLdpTask: WacLdpTask) => {
    return (wacLdpTask.wacLdpTaskType() === TaskType.getOptions)
  },
  handle: function (wacLdpTask: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    return Promise.resolve({
      resultType: ResultType.OkayWithoutBody,
      resourceData: undefined,
      createdLocation: undefined,
      isContainer: wacLdpTask.isContainer()
    })
  }
}
