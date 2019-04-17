import { Path } from '../../src/lib/storage/BlobTree'

describe('Path', () => {
  it('removes trailing slashes', function () {
    const p = new Path(['root', 'a', 'b'])
    expect(p.toString()).toEqual('root/a/b')
  })
  it('removes leading slashes', function () {
    const p = new Path(['root', 'a', 'b'])
    expect(p.toString()).toEqual('root/a/b')
  })
  it('allows for empty segments', function () {
    const p = new Path(['root', 'a', '', 'b'])
    expect(p.toString()).toEqual('root/a//b')
  })
  it('allows for spaces', function () {
    const p = new Path(['root', 'a ', ' b'])
    expect(p.toString()).toEqual('root/a / b')
  })
  it('allows for newlines', function () {
    const p = new Path(['root', 'a\n', '\rb\t'])
    expect(p.toString()).toEqual('root/a\n/\rb\t')
  })
  it('allows for dots', function () {
    const p = new Path(['root', 'a', '..', 'b'])
    expect(p.toString()).toEqual('root/a/../b')
  })
  it('does not allow slashes', function () {
    function shouldThrow () {
      return new Path(['root', 'a', '/', 'b'])
    }
    expect(shouldThrow).toThrow()
  })
  it('does not allow relative paths', function () {
    function shouldThrow () {
      return new Path(['a', 'b'])
    }
    expect(shouldThrow).toThrow()
  })
})
