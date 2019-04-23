// FIXME: work out why Stream as produced by `ResourceDataUtils::toStream` doesn't
// expose `'data'` and `'end'` events

export function toChunkStream (str: string) {
  let streamed = false
  let endCallback: () => void
  return {
    on: (eventName: string, callback: (chunk: Buffer) => void) => {
      if (eventName === 'data') {
        callback(Buffer.from(str))
        streamed = true
      }
      if (eventName === 'end') {
        endCallback = callback as () => void
      }
      if (streamed && endCallback) {
        endCallback()
      }
    }
  }
}
