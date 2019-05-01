import { Node } from './Node'

export interface Blob extends Node {
  getData (): Promise<ReadableStream | undefined>
  setData (data: ReadableStream): Promise<void>
}
