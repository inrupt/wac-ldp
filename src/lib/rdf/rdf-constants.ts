const PREFIX = {
  ACL: 'http://www.w3.org/ns/auth/acl#',
  FOAF: 'http://xmlns.com/foaf/0.1/',
  LDP: 'http://www.w3.org/ns/ldp#',
  RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  VCARD: 'http://www.w3.org/2006/vcard/ns#'
}

export const ACL = {
  AuthenticatedAgent: PREFIX.ACL + 'AuthenticatedAgent',
  Authorization: PREFIX.ACL + 'Authorization',

  Read: PREFIX.ACL + 'Read',
  Write: PREFIX.ACL + 'Write',
  Control: PREFIX.ACL + 'Control',
  Append: PREFIX.ACL + 'Append',

  accessTo: PREFIX.ACL + 'accessTo',
  default: PREFIX.ACL + 'default',

  agent: PREFIX.ACL + 'agent',
  agentGroup: PREFIX.ACL + 'agentGroup',
  agentClass: PREFIX.ACL + 'agentClass',
  mode: PREFIX.ACL + 'mode'
}

export const FOAF = {
  Agent: PREFIX.FOAF + 'Agent'
}

export const LDP = {
  BasicContainer: PREFIX.LDP + 'BasicContainer',
  Container: PREFIX.LDP + 'Container',
  Resource: PREFIX.LDP + 'Resource',
  RDFSource: PREFIX.LDP + 'RDFSource',
  contains: PREFIX.LDP + 'contains'
}
export const RDF = {
  type: PREFIX.RDF + 'type'
}

export const VCARD = {
  hasMember: PREFIX.VCARD + 'hasMember'
}
