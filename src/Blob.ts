import { Node } from './Node'

export interface Blob extends Node {
  getData (): Promise<any>
  setData (data: any): Promise<void>
}
