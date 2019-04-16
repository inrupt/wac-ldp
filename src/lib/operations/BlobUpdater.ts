import Debug from 'debug'
import StorageProcessor from '../../processors/StorageProcessor'
import Processor from '../../processors/Processor'
import { LdpResponse, ResultType } from '../api/http/HttpResponder'
import { LdpTask } from '../api/http/HttpParser'

const debug = Debug('ResourceUpdater')

export class BlobUpdater extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ResourceUpdater!')
    // TODO: implement
    return {
      resultType: ResultType.OkayWithoutBody
    } as LdpResponse
  }
}
