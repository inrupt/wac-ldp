import { determineOperation } from '../../../src/lib/core/determineOperation'
import { TaskType } from '../../../src/lib/api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../../../src/lib/api/http/HttpResponder'
import { toChunkStream } from '../helpers/toChunkStream'
import { makeResourceData } from '../../../src/lib/util/ResourceDataUtils'

test('delete blob', async () => {
  const node = {
    delete: jest.fn(() => {
      //
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.blobDelete)
  const result: WacLdpResponse = await operation({}, node)
  expect(node.delete.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test.skip('write blob', async () => {
  const node = {
    setData: jest.fn(() => {
      //
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.blobWrite)
  const result: WacLdpResponse = await operation({}, node)
  expect(node.setData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test.skip('update blob', async () => {
  const node = {
    setData: jest.fn(() => {
      //
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.blobUpdate)
  const result: WacLdpResponse = await operation({}, node)
  expect(node.setData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test('delete container', async () => {
  const node = {
    delete: jest.fn(() => {
      //
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.containerDelete)
  const result: WacLdpResponse = await operation({}, node)
  expect(node.delete.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (omit body)', async () => {
  const node = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.blobRead)
  const result: WacLdpResponse = await operation({ omitBody: true }, node)
  expect(node.getData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resourceData: {
      body: 'bla',
      contentType: 'text/plain',
      etag: 'Eo7PVCo1rFJwqH3HQJGEBA=='
    },
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (with body)', async () => {
  const node = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.blobRead)
  const result: WacLdpResponse = await operation({ omitBody: false }, node)
  expect(node.getData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resourceData: {
      body: 'bla',
      contentType: 'text/plain',
      etag: 'Eo7PVCo1rFJwqH3HQJGEBA=='
    },
    resultType: ResultType.OkayWithBody
  })
})

test('read container (omit body)', async () => {
  const node = {
    getMembers: jest.fn(() => {
      return []
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.containerRead)
  const result: WacLdpResponse = await operation({ omitBody: true }, node)
  expect(node.getMembers.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody,
    isContainer: true,
    resourceData: {
      body: '',
      contentType: 'text/turtle',
      etag: '1B2M2Y8AsgTpgAmY7PhCfg=='
    }
  })
})

test('read container (with body)', async () => {
  const node = {
    getMembers: jest.fn(() => {
      return []
    }),
    exists: () => true
  }
  const operation = determineOperation(TaskType.containerRead)
  const result: WacLdpResponse = await operation({ omitBody: false }, node)
  expect(node.getMembers.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithBody,
    isContainer: true,
    resourceData: {
      body: '',
      contentType: 'text/turtle',
      etag: '1B2M2Y8AsgTpgAmY7PhCfg=='
    }
  })
})
