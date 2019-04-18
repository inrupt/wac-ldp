import { expect } from 'chai'
import 'mocha'
import BlobTreeInMem from '../../src/lib/storage/BlobTreeInMem'
import { BlobTree, Path } from '../../src/lib/storage/BlobTree'
import { Blob } from '../../src/lib/storage/Blob'
import { Container } from '../../src/lib/storage/Container'

describe('BlobTreeInMem', () => {
  beforeEach(function () {
    // FIXME: find out how to set type restrictions on mocha-context variables
    this.storage = new BlobTreeInMem()
  })
  afterEach(function () {
    this.storage = undefined
  })
  it('adds a blob', async function () {
    // non-existing blob
    const blob = this.storage.getBlob(new Path(['root', 'foo']))
    expect(blob.exists()).to.equal(false)

    // put data into it
    await blob.setData(Buffer.from('bar'))
    expect(blob.exists()).to.equal(true)
    const readBack2 = await blob.getData()
    expect(readBack2.toString()).to.equal('bar')
  })

  it('adds a container', async function () {
    // non-existing container
    const container = this.storage.getContainer(new Path(['root', 'foo']))
    expect(container.exists()).to.equal(false)

    // add a member
    const blob = this.storage.getBlob(new Path(['root', 'foo', 'bar']))
    await blob.setData(Buffer.from('contents of foo/bar'))
    expect(container.exists()).to.equal(true)

    const members = await container.getMembers()
    expect(members).to.deep.equal([
      { name: 'bar', isContainer: false }
    ])
  })

  describe('after adding some data', function () {
    beforeEach(function () {
      this.storage.getBlob(new Path(['root', 'foo', 'bar'])).setData(Buffer.from('I am foo/bar'))
      this.storage.getBlob(new Path(['root', 'foo', 'baz', '1'])).setData(Buffer.from('I am foo/baz/1'))
      this.storage.getBlob(new Path(['root', 'foo', 'baz', '2'])).setData(Buffer.from('I am foo/baz/2'))
    })

    it('correctly reports the container member listings', async function () {
      const containerFoo: Container = this.storage.getContainer(new Path(['root', 'foo']))
      const containerBaz: Container = this.storage.getContainer(new Path(['root', 'foo', 'baz']))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).to.deep.equal([
        { name: 'bar', isContainer: false },
        { name: 'baz', isContainer: true }
      ])
      const membersBaz = await containerBaz.getMembers()
      expect(membersBaz).to.deep.equal([
        { name: '1', isContainer: false },
        { name: '2', isContainer: false }
      ])
    })

    it('correctly deletes blobs', async function () {
      const blobFooBar: Blob = this.storage.getBlob(new Path(['root', 'foo', 'bar']))
      const blobFooBaz1: Blob = this.storage.getBlob(new Path(['root', 'foo', 'baz', '1']))

      // delete foo/bar
      expect(blobFooBar.exists()).to.equal(true)
      await blobFooBar.delete()
      expect(blobFooBar.exists()).to.equal(false)

      // delete foo/baz/1
      expect(blobFooBaz1.exists()).to.equal(true)
      await blobFooBaz1.delete()
      expect(blobFooBaz1.exists()).to.equal(false)

      const containerFoo: Container = this.storage.getContainer(new Path(['root', 'foo']))
      const containerBaz: Container = this.storage.getContainer(new Path(['root', 'foo', 'baz']))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).to.deep.equal([
        { name: 'baz', isContainer: true }
      ])
      const membersBaz = await containerBaz.getMembers()
      expect(membersBaz).to.deep.equal([
        { name: '2', isContainer: false }
      ])
    })

    it('correctly deletes containers', async function () {
      const containerFooBaz: Container = this.storage.getContainer(new Path(['root', 'foo', 'baz']))

      // delete foo/baz/
      expect(containerFooBaz.exists()).to.equal(true)
      await containerFooBaz.delete()
      expect(containerFooBaz.exists()).to.equal(false)

      const containerFoo: Container = this.storage.getContainer(new Path(['root', 'foo']))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).to.deep.equal([
        { name: 'bar', isContainer: false }
      ])
      const membersBaz = await containerFooBaz.getMembers()
      expect(membersBaz).to.deep.equal([])
    })
  })
})
