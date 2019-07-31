import * as http from 'http'
import { Blob } from '../../../src/lib/storage/Blob'
import { TaskType, WacLdpTask } from '../../../src/lib/api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../../../src/lib/api/http/HttpResponder'
import { toChunkStream } from '../helpers/toChunkStream'
import { makeResourceData, RdfType, bufferToStream } from '../../../src/lib/rdf/ResourceDataUtils'
import { Container } from '../../../src/lib/storage/Container'
import { readContainerHandler } from '../../../src/lib/operationHandlers/readContainerHandler'
import { StoreManager } from '../../../src/lib/rdf/StoreManager'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'
import { deleteContainerHandler } from '../../../src/lib/operationHandlers/deleteContainerHandler'
import { readBlobHandler } from '../../../src/lib/operationHandlers/readBlobHandler'
import { deleteBlobHandler } from '../../../src/lib/operationHandlers/deleteBlobHandler'

let storage: any

beforeEach(() => {
  storage = {
    getMetaData: jest.fn(() => {
      return {
        contentType: 'text/plain',
        body: bufferToStream(Buffer.from('asdf'))
      }
    }),
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    })
  } as unknown
})
afterEach(() => {
  storage = undefined
})

test('delete blob', async () => {
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'DELETE',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await deleteBlobHandler.handle(task, storeManager, 'https://example.com', false, false)
  expect(storage.delete.mock.calls).toEqual([
    [new URL('https://example.com/foo')]
  ])
  expect(result).toEqual({
    resourcesChanged: [ new URL('https://example.com/foo') ],
    resultType: ResultType.OkayWithoutBody
  })
})

test.skip('write blob', async () => {
  // const node: Blob = {
  //   setData: jest.fn(() => {
  //     //
  //   }),
  //   exists: () => true
  // } as unknown as Blob
  // const operation = basicOperations(TaskType.blobWrite)
  // const task = new WacLdpTask('', {} as http.IncomingMessage)
  // const result: WacLdpResponse = await operation(task, node, false)
  // expect((node as any).setData.mock.calls).toEqual([
  //   []
  // ])
  // expect(result).toEqual({
  //   resultType: ResultType.OkayWithoutBody
  // })
})

test.skip('update blob', async () => {
  // const node: Blob = {
  //   setData: jest.fn(() => {
  //     //
  //   }),
  //   exists: () => true
  // } as unknown as Blob
  // const operation = basicOperations(TaskType.blobUpdate)
  // const task = new WacLdpTask('', {} as http.IncomingMessage)
  // const result: WacLdpResponse = await operation(task, node, false)
  // expect((node as any).setData.mock.calls).toEqual([
  //   []
  // ])
  // expect(result).toEqual({
  //   resultType: ResultType.OkayWithoutBody
  // })
})

test('delete container', async () => {
  const task = new WacLdpTask('https://example.com', {
    url: '/foo/',
    method: 'GET',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await deleteContainerHandler.handle(task, storeManager, 'https://example.com', false, false)
  expect(storage.delete.mock.calls).toEqual([
    [new URL('https://example.com/foo/')]
  ])
  expect(result).toEqual({
    resourcesChanged: [ new URL('https://example.com/foo/') ],
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (omit body)', async () => {

  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'HEAD'
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await readBlobHandler.handle(task, storeManager, 'https://example.com', false, false)

  expect(storage.getMetaData.mock.calls).toEqual([
    [new URL('https://example.com/foo')]
  ])
  // without body
  expect(storage.getData.mock.calls).toEqual([])
  expect(result).toEqual({
    resourceData: {
      body: 'bla',
      contentType: 'text/plain',
      etag: 'Eo7PVCo1rFJwqH3HQJGEBA==',
      rdfType: RdfType.Unknown
    },
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (with body)', async () => {
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'GET'
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await readBlobHandler.handle(task, storeManager, 'https://example.com', false, false)

  expect(storage.getMetaData.mock.calls).toEqual([
    [new URL('https://example.com/foo')]
  ])
  expect(storage.getData.mock.calls).toEqual([
    [new URL('https://example.com/foo')]
  ])
  expect(result).toEqual({
    resourceData: {
      body: 'bla',
      contentType: 'text/plain',
      etag: 'Eo7PVCo1rFJwqH3HQJGEBA==',
      rdfType: RdfType.Unknown
    },
    resultType: ResultType.OkayWithBody
  })
})

test('read blob (if-none-match 304)', async () => {
  // see https://github.com/inrupt/wac-ldp/issues/114
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'GET',
    headers: {
      'if-none-match': '"Eo7PVCo1rFJwqH3HQJGEBA=="'
    }
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  expect.assertions(2)
  await readBlobHandler.handle(task, storeManager, 'https://example.com', false, false).catch(e => {
    expect(e.resultType).toEqual(ResultType.NotModified)
  })
  expect(storage.getData.mock.calls).toEqual([
    []
  ])
})

test('write blob (if-none-match 412)', async () => {
  // see https://github.com/inrupt/wac-ldp/issues/114
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'PUT',
    headers: {
      'if-none-match': '"Eo7PVCo1rFJwqH3HQJGEBA=="'
    }
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  expect.assertions(2)
  await readBlobHandler.handle(task, storeManager, 'https://example.com', false, false).catch(e => {
    expect(e.resultType).toEqual(ResultType.PreconditionFailed)
  })

  expect(storage.getData.mock.calls).toEqual([
    []
  ])
})

test('read container (omit body)', async () => {
  const task = new WacLdpTask('https://example.com', {
    url: '/foo/',
    method: 'HEAD',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await readContainerHandler.handle(task, storeManager, 'https://example.com', false, false)
  expect(storage.getMembers.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody,
    isContainer: true,
    resourceData: {
      body: [
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#BasicContainer> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#RDFSource> .`,
        ''
      ].join('\n'),
      contentType: 'text/turtle',
      etag: 'b7tBKbyK9TFeTR66sFzUKw==',
      rdfType: RdfType.Turtle
    }
  })
})

test('read container (with body)', async () => {
  const task = new WacLdpTask('https://example.com', {
    url: '/foo/',
    method: 'GET',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await readContainerHandler.handle(task, storeManager, 'https://example.com', false, false)
  expect(storage.getMembers.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithBody,
    isContainer: true,
    resourceData: {
      body: [
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#BasicContainer> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#RDFSource> .`,
        ''
      ].join('\n'),
      contentType: 'text/turtle',
      etag: 'b7tBKbyK9TFeTR66sFzUKw==',
      rdfType: RdfType.Turtle
    }
  })
})

test('read glob (with body)', async () => {
  // ...
})
