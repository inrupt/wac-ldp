export const LDP = {
  contains: 'http://www.w3.org/ns/ldp#contains'
}

function ACL_NS (str: string) {
  return 'http://www.w3.org/ns/auth/acl#' + str
}

export const ACL = {
  accessTo: ACL_NS('accessTo'),
  default: ACL_NS('default'),
  agent: ACL_NS('agent'),
  agentGroup: ACL_NS('agentGroup'),
  agentClass: ACL_NS('agentClass'),
  AuthenticatedAgent: ACL_NS('AuthenticatedAgent'),
  Authorization: ACL_NS('Authorization'),
  mode: ACL_NS('mode'),
  Read: ACL_NS('Read'),
  Write: ACL_NS('Write'),
  Control: ACL_NS('Control'),
  Append: ACL_NS('Append')

}

export const FOAF = {
  Agent: 'http://xmlns.com/foaf/0.1/Agent'
}

export const RDF = {
  type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
}
