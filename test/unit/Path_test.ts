import { expect } from 'chai'
import 'mocha'
import { Path } from '../../src/lib/storage/BlobTree'

describe('Path', () => {
  it('removes trailing slashes', function () {
    const p = new Path(['a', 'b'])
    expect(p.toString()).to.equal('a/b')
  })
  it('removes leading slashes', function () {
    const p = new Path(['a', 'b'])
    expect(p.toString()).to.equal('a/b')
  })
  it('allows for empty segments', function () {
    const p = new Path(['a', '', 'b'])
    expect(p.toString()).to.equal('a//b')
  })
  it('allows for spaces', function () {
    const p = new Path(['a ', ' b'])
    expect(p.toString()).to.equal('a / b')
  })
  it('allows for newlines', function () {
    const p = new Path(['a\n', '\rb\t'])
    expect(p.toString()).to.equal('a\n/\rb\t')
  })
  it('allows for dots', function () {
    const p = new Path(['a', '..', 'b'])
    expect(p.toString()).to.equal('a/../b')
  })
  it('does not allow slashes', function () {
    function shouldThrow () {
      return new Path(['a', '/', 'b'])
    }
    expect(shouldThrow).to.throw()
  })
})
