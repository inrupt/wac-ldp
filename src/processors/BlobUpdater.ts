import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from './Responder'
import { LdpTask } from './LdpParser'

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
