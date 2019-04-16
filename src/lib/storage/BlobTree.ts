import { Container } from './Container'
import { Blob } from './Blob'

export class Path {
  segments: Array<string>
  constructor (segments: Array<string>) {
    segments.map(segment => {
      if (segment.indexOf('/') !== -1) {
        throw new Error('No slashes allowed in path segments!')
      }
    })
    this.segments = segments
  }
  toString (): string {
    return this.segments.join('/')
  }
  toContainerPathPrefix (): string {
    return this.toString() + '/'
  }
}

// throws:
// sub-blob attempt
// getData/setData when doesn't exist
// containers always exist, unless there is a blob at their filename
// creating a path ignores the trailing slash
export interface BlobTree {
  getContainer (path: Path): Container
  getBlob (path: Path): Blob
  on (eventName: string, eventHandler: (event: any) => void): void
}
