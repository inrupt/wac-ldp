import { WacLdpTask } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { RdfLayer } from '../rdf/RdfLayer'

const debug = Debug('unknown-operation-catch-all')

export const unknownOperationCatchAll = {
  canHandle: (wacLdpTask: WacLdpTask) => true,
  handle: function (wacLdpTask: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    debug('operation unknownOperation!')
    throw new ErrorResult(ResultType.MethodNotAllowed)
  }
}
