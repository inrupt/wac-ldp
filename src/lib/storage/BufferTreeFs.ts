import { Member } from './Container'
import * as fs from 'fs'
import * as path from 'path'

export interface Resource {
  getBodyStream (): ReadableStream<Buffer>
  getMetaData (): { [i: string]: Buffer }
  replace (newVersion: Resource): Promise<void>
}

export interface BufferTree {
  getMembers (path: Array<string>): Promise<Array<Member> | undefined>
  getResource (path: Array<string>): Promise<Resource>
}

function urlToPath (path: Array<string>, contentType: string): string {
  return url.pathname
}

function memberPath (folderPath: string, name: string) {
  return path.join(folderPath, name)
}
export class BufferTreeFs implements BufferTree {
  async getMembers (path: Array<string>): Promise<Array<Member> | undefined> {
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
  getResource (path: Array<string>): Promise<ReadableResource> {
    // try without $.
    // try with $.

  }
  setResource (path: Array<string>, data: ReadableResource): Promise<void>
}