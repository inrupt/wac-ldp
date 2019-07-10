export function expectedResponseHeaders (options: any) {
  let ret: any = {
    'Accept-Patch': 'application/sparql-update',
    'Accept-Post': 'application/sparql-update',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type, Origin, Referer, X-Requested-With, Link, Slug',
    'Access-Control-Allow-Origin': options.originToAllow || '*',
    'Access-Control-Expose-Headers': 'User, Location, Link, Vary, Last-Modified, ETag, Accept-Patch, Accept-Post, Updates-Via, Allow, WAC-Allow, Content-Length, WWW-Authenticate',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Content-Type': options.contentType || 'content/type',
    'Link': `<.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"; ${(options.isContainer ? '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"; ' : '')}<${options.idp}>; rel=\"http://openid.net/specs/connect/1.0/issuer\"; <${(options.serviceOrigin || 'http://localhost:8080')}/.well-known/solid>; rel="service"`,
    'Updates-Via': options.updatesVia,
    'Vary': 'Accept, Authorization, Origin',
    'X-Powered-By': 'inrupt pod-server (alpha)'
  }
  if (options.etag) {
    ret['ETag'] = `"${options.etag}"`
  }
  if (options.location) {
    ret['Location'] = options.location
  }
  return ret
}
