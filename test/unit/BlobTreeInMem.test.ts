import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { BlobTree, Path } from '../../src/lib/storage/BlobTree'
import { Blob } from '../../src/lib/storage/Blob'
import { Container } from '../../src/lib/storage/Container'
import { fromStream, toStream } from '../../src/ResourceData'

let storage: BlobTree

describe('BlobTreeInMem', () => {
  beforeEach(function () {
    // FIXME: find out how to set type restrictions on mocha-context variables
    storage = new BlobTreeInMem()
  })
  afterEach(function () {
    storage = undefined
  })
  it('adds a blob', async function () {
    // non-existing blob
    const blob = storage.getBlob(new Path(['root', 'foo']))
    expect(blob.exists()).toEqual(false)

    // put data into it
    await blob.setData(toStream('bar'))
    expect(blob.exists()).toEqual(true)
    const readBack2 = await fromStream(await blob.getData())
    expect(readBack2.toString()).toEqual('bar')
  })

  it('adds a container', async function () {
    // non-existing container
    const container = storage.getContainer(new Path(['root', 'foo']))
    expect(container.exists()).toEqual(false)

    // add a member
    const blob = storage.getBlob(new Path(['root', 'foo', 'bar']))
    await blob.setData(toStream('contents of foo/bar'))
    expect(container.exists()).toEqual(true)

    const members = await container.getMembers()
    expect(members).toEqual([
      { name: 'bar', isContainer: false }
    ])
  })

  describe('after adding some data', () => {
    beforeEach(async () => {
      await storage.getBlob(new Path(['root', 'foo', 'bar'])).setData(toStream('I am foo/bar'))
      await storage.getBlob(new Path(['root', 'foo', 'baz', '1'])).setData(toStream('I am foo/baz/1'))
      await storage.getBlob(new Path(['root', 'foo', 'baz', '2'])).setData(toStream('I am foo/baz/2'))
    })

    it('correctly reports the container member listings', async function () {
      const containerFoo: Container = storage.getContainer(new Path(['root', 'foo']))
      const containerBaz: Container = storage.getContainer(new Path(['root', 'foo', 'baz']))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'bar', isContainer: false },
        { name: 'baz', isContainer: true }
      ])
      const membersBaz = await containerBaz.getMembers()
      expect(membersBaz).toEqual([
        { name: '1', isContainer: false },
        { name: '2', isContainer: false }
      ])
    })

    it('correctly deletes blobs', async function () {
      const blobFooBar: Blob = storage.getBlob(new Path(['root', 'foo', 'bar']))
      const blobFooBaz1: Blob = storage.getBlob(new Path(['root', 'foo', 'baz', '1']))

      // delete foo/bar
      expect(blobFooBar.exists()).toEqual(true)
      await blobFooBar.delete()
      expect(blobFooBar.exists()).toEqual(false)

      // delete foo/baz/1
      expect(blobFooBaz1.exists()).toEqual(true)
      await blobFooBaz1.delete()
      expect(blobFooBaz1.exists()).toEqual(false)

      const containerFoo: Container = storage.getContainer(new Path(['root', 'foo']))
      const containerBaz: Container = storage.getContainer(new Path(['root', 'foo', 'baz']))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'baz', isContainer: true }
      ])
      const membersBaz = await containerBaz.getMembers()
      expect(membersBaz).toEqual([
        { name: '2', isContainer: false }
      ])
    })

    it('correctly deletes containers', async function () {
      const containerFooBaz: Container = storage.getContainer(new Path(['root', 'foo', 'baz']))

      // delete foo/baz/
      expect(containerFooBaz.exists()).toEqual(true)
      await containerFooBaz.delete()
      expect(containerFooBaz.exists()).toEqual(false)

      const containerFoo: Container = storage.getContainer(new Path(['root', 'foo']))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'bar', isContainer: false }
      ])
      const membersBaz = await containerFooBaz.getMembers()
      expect(membersBaz).toEqual([])
    })
  })
})
