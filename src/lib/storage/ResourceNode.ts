import { Node } from './Node'

export interface ResourceNode extends Node {
  getData (): Promise<Array<Buffer>>
  setData (data: Array<Buffer>): Promise<void>
  getBodyVersion (etag: string): Promise<ReadableStream>
  setBodyVersion (etag: string, data: ReadableStream): Promise<void>
  deleteBodyVersion (etag: string): Promise<void>
}
