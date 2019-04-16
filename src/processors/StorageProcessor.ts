import { BlobTree } from '../lib/storage/BlobTree'

export default class StorageProcessor {
  storage: BlobTree

  constructor (storage: BlobTree) {
    this.storage = storage
  }
}
