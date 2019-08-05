import * as http from 'http'
import { EventEmitter } from 'events'

export interface WacLdp extends EventEmitter {
  setRootAcl (storageRoot: URL, owner: URL): Promise<void>
  setPublicAcl (inboxUrl: URL, owner: URL, modeName: string): Promise<void>
  createLocalDocument (url: URL, contentType: string, body: string): Promise<void>
  containerExists (url: URL): Promise<boolean>
  handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void>
  getTrustedAppModes (webId: URL, origin: string): Promise<Array<URL>>
  setTrustedAppModes (webId: URL, origin: string, modes: Array<URL>): Promise<void>
  hasAccess (webId: URL, origin: string, url: URL, mode: URL): Promise<boolean>
}
