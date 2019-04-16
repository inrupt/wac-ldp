import { Container } from './Container'
import { Blob } from './Blob'

export class Path {
  parts: Array<string>
  constructor (str: string) {
    this.parts = str.split('/').filter(x => !!x.length)
  }
  toString (): string {
    return this.parts.join('/')
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
