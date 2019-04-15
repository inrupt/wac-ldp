import { Container } from './Container'
import { Blob } from './Blob'

export class Path {
  parts: Array<string>
  constructor (arg: string | Array<string>) {
    if (Array.isArray(arg)) {
      this.parts = arg
    } else {
      this.parts = arg.split('/').filter(x => !!x.length)
    }
  }
  asString (): string {
    return this.parts.join('/')
  }
  parentNode (): Path | undefined {
    if (this.parts.length === 0) {
      return undefined
    }
    const parentParts = this.parts.slice(0, this.parts.length - 1)
    return new Path(parentParts)
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
