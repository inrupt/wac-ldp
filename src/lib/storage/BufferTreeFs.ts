import { Member } from './Container'
import * as fs from 'fs'
import * as path from 'path'

export interface ReadableResource {
  body: ReadableStream<Buffer>
  metaData: { [i: string]: Buffer }
}

export interface BufferTree {
  getMembers (url: URL): Promise<Array<Member> | undefined>
  getResource (url: URL): Promise<ReadableResource>
  setResource (url: URL, data: ReadableResource): Promise<void>
}

function urlToPath (url: URL, contentType: string): string {
  return url.pathname
}

function memberPath (folderPath: string, name: string) {
  return path.join(folderPath, name)
}
export class BufferTreeFs implements BufferTree {
  async getMembers (url: URL): Promise<Array<Member> | undefined> {
    const folderPath = urlToPath(url)
    const files: Array<string> = await fs.promises.readdir(folderPath)
    const results: Array<Member> = []
    await Promise.all(files.map(async (name): Promise<void> => {
      const stat = await fs.promises.stat(memberPath(folderPath, name))
      results.push({
        name,
        isContainer: stat.isDirectory()
      } as Member)
    }))
    return results
  }
  getResource (url: URL): Promise<ReadableResource> {
    // try without $.
    // try with $.

  }
  setResource (url: URL, data: ReadableResource): Promise<void>
}