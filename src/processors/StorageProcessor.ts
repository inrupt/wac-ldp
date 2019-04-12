import { BlobTree } from '../BlobTree'

export default class StorageProcessor {
  storage: BlobTree

  constructor (storage: BlobTree) {
    this.storage = storage
  }
}
