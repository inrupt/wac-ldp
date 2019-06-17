import { WacLdpTask } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { RdfLayer } from '../rdf/RdfLayer'
import { OperationHandler } from './OperationHandler';

const debug = Debug('unknown-operation-catch-all')

export class UnknownOperationCatchAll extends OperationHandler {
  canHandle(wacLdpTask: WacLdpTask) {
    return true
  }
  handle(wacLdpTask: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean): Promise<WacLdpResponse> {
    debug('operation unknownOperation!')
    throw new ErrorResult(ResultType.MethodNotAllowed)
  }
}
