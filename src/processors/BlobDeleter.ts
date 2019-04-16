import Debug from 'debug'
import StorageProcessor from './StorageProcessor'
import Processor from './Processor'
import { LdpResponse, ResultType } from './Responder'
import { LdpTask } from './LdpParser'

const debug = Debug('ResourceDeleter')

async function fromStream (stream: ReadableStream): Promise<any> {
  let readResult
  let str = ''
  let value
  const reader = stream.getReader()
  do {
    readResult = await reader.read()
    str += readResult.value
  } while (!readResult.done)
  let obj
  try {
    obj = JSON.parse(str)
  } catch (error) {
    throw new Error('string in stream is not JSON')
  }
  return obj
}

export class BlobDeleter extends StorageProcessor implements Processor {
  async process (task: LdpTask) {
    debug('LdpParserResult ResourceDeleter!')
    const resource = this.storage.getBlob(task.path)
    // FIXME: duplicate code with ResourceWriter. use inheritence with common ancestor?
    if (task.ifMatch) {
      const resourceData = await fromStream(await resource.getData())
      if (resourceData.etag !== task.ifMatch) {
        return {
          resultType: ResultType.PreconditionFailed
        } as LdpResponse
      }
    }
    await resource.delete()
    return {
      resultType: ResultType.OkayWithoutBody
    } as LdpResponse
  }
}
