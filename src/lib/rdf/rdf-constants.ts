const PREFIX = {
  ACL: 'http://www.w3.org/ns/auth/acl#',
  FOAF: 'http://xmlns.com/foaf/0.1/',
  LDP: 'http://www.w3.org/ns/ldp#',
  RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  VCARD: 'http://www.w3.org/2006/vcard/ns#'
}

export const ACL = {
  AuthenticatedAgent: new URL(PREFIX.ACL + 'AuthenticatedAgent'),
  Authorization: new URL(PREFIX.ACL + 'Authorization'),

  Read: new URL(PREFIX.ACL + 'Read'),
  Write: new URL(PREFIX.ACL + 'Write'),
  Control: new URL(PREFIX.ACL + 'Control'),
  Append: new URL(PREFIX.ACL + 'Append'),

  accessTo: new URL(PREFIX.ACL + 'accessTo'),
  default: new URL(PREFIX.ACL + 'default'),

  agent: new URL(PREFIX.ACL + 'agent'),
  agentGroup: new URL(PREFIX.ACL + 'agentGroup'),
  agentClass: new URL(PREFIX.ACL + 'agentClass'),
  mode: new URL(PREFIX.ACL + 'mode'),

  origin: new URL(PREFIX.ACL + 'origin'),
  trustedApp: new URL(PREFIX.ACL + 'trustedApp')

}

export const FOAF = {
  Agent: new URL(PREFIX.FOAF + 'Agent')
}

export const LDP = {
  BasicContainer: new URL(PREFIX.LDP + 'BasicContainer'),
  Container: new URL(PREFIX.LDP + 'Container'),
  Resource: new URL(PREFIX.LDP + 'Resource'),
  RDFSource: new URL(PREFIX.LDP + 'RDFSource'),
  contains: new URL(PREFIX.LDP + 'contains')
}
export const RDF = {
  type: new URL(PREFIX.RDF + 'type')
}

export const VCARD = {
  hasMember: new URL(PREFIX.VCARD + 'hasMember')
}
