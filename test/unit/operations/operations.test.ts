import { determineOperation } from '../../../src/lib/core/determineOperation'
import { TaskType, WacLdpTask } from '../../../src/lib/api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../../../src/lib/api/http/HttpResponder'
import { toChunkStream } from '../helpers/toChunkStream'
import { makeResourceData } from '../../../src/lib/util/ResourceDataUtils'
import { Container } from '../../../src/lib/storage/Container'

test('delete blob', async () => {
  const node: Blob = {
    delete: jest.fn(() => {
      //
    }),
    exists: () => true
  } as unknown as Blob
  const operation = determineOperation(TaskType.blobDelete)
  const result: WacLdpResponse = await operation({} as WacLdpTask, node)
  expect((node as any).delete.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test.skip('write blob', async () => {
  const node: Blob = {
    setData: jest.fn(() => {
      //
    }),
    exists: () => true
  } as unknown as Blob
  const operation = determineOperation(TaskType.blobWrite)
  const result: WacLdpResponse = await operation({} as WacLdpTask, node)
  expect((node as any).setData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test.skip('update blob', async () => {
  const node: Blob = {
    setData: jest.fn(() => {
      //
    }),
    exists: () => true
  } as unknown as Blob
  const operation = determineOperation(TaskType.blobUpdate)
  const result: WacLdpResponse = await operation({} as WacLdpTask, node)
  expect((node as any).setData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test('delete container', async () => {
  const node: Container = {
    delete: jest.fn(() => {
      //
    }),
    exists: () => true
  } as unknown as Container
  const operation = determineOperation(TaskType.containerDelete)
  const result: WacLdpResponse = await operation({} as WacLdpTask, node)
  expect((node as any).delete.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (omit body)', async () => {
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  } as unknown as Blob
  const operation = determineOperation(TaskType.blobRead)
  const result: WacLdpResponse = await operation({ omitBody: true } as WacLdpTask, node)
  expect((node as any).getData.mock.calls).toEqual([
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
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  } as unknown as Blob
  const operation = determineOperation(TaskType.blobRead)
  const result: WacLdpResponse = await operation({ omitBody: false } as WacLdpTask, node)
  expect((node as any).getData.mock.calls).toEqual([
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
  const node: Container = {
    getMembers: jest.fn(() => {
      return []
    }),
    exists: () => true
  } as unknown as Container
  const operation = determineOperation(TaskType.containerRead)
  const result: WacLdpResponse = await operation({ path: '/foo', omitBody: true } as unknown as WacLdpTask, node)
  expect((node as any).getMembers.mock.calls).toEqual([
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
  const node: Container = {
    getMembers: jest.fn(() => {
      return []
    }),
    exists: () => true
  }as unknown as Container
  const operation = determineOperation(TaskType.containerRead)
  const result: WacLdpResponse = await operation({ path: '/foo', omitBody: false } as unknown as WacLdpTask, node)
  expect((node as any).getMembers.mock.calls).toEqual([
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

test('read glob (with body)', async () => {
  // ...
})
