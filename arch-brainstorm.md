components diagram


The code architecture of the pod-server is split into modules:
* pod-server itself
* solid-idp
* wac-ldp
* websockets-pubsub

The IDP exposes a koa handler. Apart from that, it sends out emails for verifications and password reminders. It also exposes an event when an account
is created or deleted, and its dialogs will do xhr edits to trustedApps.

wac-ldp exposes a number of interfaces which websockets-pubsub consumes:
* it emits change events 
* a function to check updates-via tickets
* a function for checking whether a given webId has read access to a given resource
apart form that, it exposes a koa handler, which solid-idp consumes.

websockets-pubsub exposes a 'Hub' object, with a websocket-onconnection handler and a publish method


wac-ldp is split primarily into two layers: storage and business logic.

- if there is no host header, X-Forwarded-Host is used. If that is not given, the server's default hostname is used.
- that means that for instance http://127.0.0.1:8000 and http://my-laptop:8000 are translated to http://localhost:8000 
- URLs are split up into a host-part and a path-part. The path-part is further split on slashes.
- BlobTree doesn't understand RDF but it understands containers
- resources are stored as blobs on the basis of their full URL, specifically { body, rdfType, contentType, etag }, JSON-stringified into a stream.
- apart from this key-value access, the storage provides access to container listings.

The business logic layer is split into components:

* http parser
* http responder
* execute task
  * uses access check utils ( throws an error or returns 'appendOnly' as appropriate, has direct access to the storage, and to a http client)
  * uses rdf utils

Execute task is further split up into:
* special case for OPTIONS
* primary access check
* special-case handler for globbing (involving calls to more access check and to rdf-merge)
* special-case handler for container post, is converted to 'write blob'
* delete container
* delete blob
* read container (will use rdf utils)
* read blob (may use rdf utils for conneg, sparql GET and ldp-paging)
* update blob (will use rdf patcher, may be appendOnly based on primary access check)
* write blob (maybe from document PUT or from container POST)
