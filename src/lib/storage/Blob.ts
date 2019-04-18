import { Node } from './Node'

export interface Blob extends Node {
  getData (): Promise<ReadableStream>
  setData (data: ReadableStream): Promise<void>
}
