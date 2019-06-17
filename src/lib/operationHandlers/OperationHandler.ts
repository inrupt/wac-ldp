import { WacLdpTask } from '../api/http/HttpParser'
import { RdfLayer } from '../rdf/RdfLayer'
import { WacLdpResponse } from '../api/http/HttpResponder'

export abstract class OperationHandler {
  public static canHandle: (wacLdpTask: WacLdpTask) => boolean
  public static executeTask: (wacLdpTask: WacLdpTask, aud: string, rdfLayer: RdfLayer, skipWac: boolean) => Promise<WacLdpResponse>
}
