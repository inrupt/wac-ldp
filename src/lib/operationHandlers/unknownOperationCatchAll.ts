import { WacLdpTask } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { RdfFetcher } from '../rdf/RdfFetcher'

const debug = Debug('unknown-operation-catch-all')

export const unknownOperationCatchAll = {
  canHandle: (wacLdpTask: WacLdpTask) => true,
  handle: function (wacLdpTask: WacLdpTask, aud: string, rdfFetcher: RdfFetcher, skipWac: boolean): Promise<WacLdpResponse> {
    debug('operation unknownOperation!')
    throw new ErrorResult(ResultType.MethodNotAllowed)
  }
}
