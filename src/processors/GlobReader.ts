import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from '../lib/api/http/Responder'
import { LdpTask } from '../lib/api/http/LdpParser'

const debug = Debug('GlobReader')

export class GlobReader extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult GlobReader!')
    // TODO: implement
    return {
      resultType: ResultType.OkayWithBody
    } as LdpResponse
  }
}
