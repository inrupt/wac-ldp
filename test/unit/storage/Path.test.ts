import { Path } from '../../../src/lib/storage/BlobTree'

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
  it('can do .toChild', function () {
    const p = new Path(['root', 'a' ])
    expect(p.toChild('b').toString()).toEqual('root/a/b')
  })
  it('can do .toParent', function () {
    const p = new Path(['root', 'a' ])
    expect(p.toParent().toString()).toEqual('root')
  })
  it('does not allow root.toParent', function () {
    const p = new Path([ 'root' ])
    expect(p.toParent.bind(p)).toThrow('root has no parent!')
  })

  it('can do .hasSuffix', function () {
    const p = new Path(['root', 'ablast' ])
    expect(p.hasSuffix('bla')).toEqual(false)
    expect(p.hasSuffix('blast')).toEqual(true)
  })
  it('can do .appendSuffix', function () {
    const p = new Path(['root', 'foo' ])
    expect(p.appendSuffix('bar').toString()).toEqual('root/foobar')
  })
  it('can do .removeSuffix', function () {
    const p = new Path(['root', 'foo' ])
    expect(p.removeSuffix('oo').toString()).toEqual('root/f')
    expect(() => p.removeSuffix('afoo')).toThrow('no suffix match (last segment name shorter than suffix)')
    expect(() => p.removeSuffix('bar')).toThrow('no suffix match')
  })
})
