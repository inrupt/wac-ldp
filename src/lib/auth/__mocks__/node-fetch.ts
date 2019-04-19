import fs from 'fs'
import { Response } from 'node-fetch'
import { URL } from 'url'
import Debug from 'debug'

const debug = Debug('fetch-mock')

const WEB_FIXTURES = './test/fixtures/web'

export interface Response extends Response {}

export default function fetch (urlStr: string) {
  const url = new URL(urlStr)
  const response = fs
  return new Promise((resolve, reject) => {
    debug('reading web fixture', url)
    fs.readFile(`${WEB_FIXTURES}/${url.hostname}/${url.port}${url.pathname}`, (err, data) => {
      if (err) {
        debug('error reading web fixture', url)
        reject(err)
      } else {
        debug('success reading web fixture', url)
        resolve({
          json () {
            return JSON.parse(data.toString())
          }
        } as Response)
      }
    })
  })
}
