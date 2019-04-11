import { Node } from './Node'

export interface Container extends Node {
  getMembers (): Promise<Array<string>>
}
