import * as Stream from 'stream'
import Debug from 'debug'
import { makeResourceData, ResourceData } from './ResourceData'
const debug = Debug('membersListAsResourceData')

// NOTE: This is a temporary file, will be replaced in
// https://github.com/inrupt/wac-ldp/pull/14
 
const NEWLINE = '\r\n'

function toTurtle (containerUrl: string, fileNames: Array<string>): string {
  debug('folderDescription', fileNames)

  const prefixes = [
    '@prefix ldp: <http://www.w3.org/ns/ldp#>.'
  ]
  const memberRefs = fileNames.map(filename => `<${filename}>`)
  const containerItem = [
    `<${containerUrl}>`,
    `    ldp:contains ${memberRefs.join(', ')};`
  ].join(NEWLINE)
  return [
    prefixes.join(NEWLINE),
    containerItem
  ].join(NEWLINE + NEWLINE) + NEWLINE
}

function toJsonLd (containerUrl: string, fileNames: Array<string>): string {
  return JSON.stringify({
    '@id': containerUrl,
    'contains': fileNames.map(fileName => containerUrl + fileName),
    '@context': {
      'contains': {
        '@id': 'http://www.w3.org/ns/ldp#contains',
        '@type': '@id'
      },
      'ldp': 'http://www.w3.org/ns/ldp#'
    }
  })
}

export default function membersListAsResourceData (containerUrl, fileNames, asJsonLd): ResourceData {
  debug('membersListAsResourceData', containerUrl, fileNames, asJsonLd)
  if (asJsonLd) {
    return makeResourceData('application/ld+json', toJsonLd(containerUrl, fileNames))
  } else {
    return makeResourceData('text/turtle', toTurtle(containerUrl, fileNames))
  }
}
