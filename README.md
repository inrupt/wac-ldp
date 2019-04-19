# wac-ldp

[![Build Status](https://travis-ci.org/inrupt/wac-ldp.svg?branch=master)](https://travis-ci.org/inrupt/wac-ldp) [![Coverage Status](https://coveralls.io/repos/github/inrupt/wac-ldp/badge.svg?branch=master)](https://coveralls.io/github/inrupt/wac-ldp?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/inrupt/wac-ldp.svg)](https://greenkeeper.io/)

A central component for Solid servers, handles Web Access Control and Linked Data Platform concerns.

## Code Structure

### Entry point
The entry point is src/server.ts, which instantiates a http server, a BlobTree storage, and the core app.

### BlobTree
The BlobTree storage exposes a carefully tuned interface to the persistence layer, which is similar to the well-known "key-value store" concept, where opaque Blobs can be stored and retrieved, using arbitrary strings as keys. But the BlobTree interface differs from a key-value store interface in that it not only allows writing and reading blobs of data, but also querying 'Containers', which is similar to doing `ls` on a folder on a unix file system: it gives you a list of the directly contained blobs and containers.
This means that if we store all LDP resources inside BlobTree blobs, using the resource path from the http level as the blob's path at the BlobTree level, then implementing LDP GET requests on containers becomes very easy out of the box.

### Core
The core application code is in src/lib/code/ and deals with:
* calling src/lib/api/http/HttpParser to parse the HTTP request
* calling the functions from src/lib/auth/ to determine whether the request is authorized to begin with
* fetching the main resource from storage
* in the case of Glob, checking authorization to read each of the contained resources, and fetching those
* in the case of POST to a container, picking a name for the new resource and fetching a handle to that
* check the ETag of the resource in case an If-Match or If-None-Match header was present on the request
* given the necessary handle(s) to BlobTree node(s), execute the desired operation from src/lib/operations/ (in the case of PATCH, adding a parameter whether it should be executed append-only)
* in case of succses, passing the result back to src/lib/api/http/HttpResponder
* in case of an exception, passing the appropriate http response back to src/lib/api/http/HttpResponder

### Auth
The auth code is in src/lib/auth/ and deals with:
* determining the webId from the bearer token, and checking the signature, expiry, and audience on the there
* fetching the apprioriate ACL document from storage and loading that into an in-memory RDF graph
* based on the webId, find out which access modes should be allowed
* based on the origin, find out whether at least one of the resource owner has that origin as a trusted app
* decide if the required access mode is authorized (with a special case for append-only approval of a PATCH)

### HTTP
In src/lib/api/http/ are two important classes, one for parsing an incoming http request, and one for constructing an outgoing http response. Although each step they do, like setting a numeric http response status code, or extracting a bearer token string from an authorization header, is computationally simple, a lot of the correctness of this module (looking at https://github.com/w3c/ldp-testsuite and the WAC test suite that is under development) depends on the details in these two files.

### Operations
This is where the action is, each file in src/lib/operations/ does the actual execution of the operation as intended in the incoming HTTP/LDP request. At the same time, each of these files is also really small because of all the preparation that already went before it (the parsing of the http request, and the access checks) and because of the way the BlobTree storage interface was designed, with these operations in mind. For instance a DeleteBlob operation just calls blob.delete, and that's it.

### Utils
The ReadContainer operation does need to do a bit of work to convert the list of members as reported by the BlobTree Container into an RDF representation like Turtle or JSON-LD. We use RDF-EXT for this, and the calls to that module are wrapped into a util in the src/lib/utils/ folder. Likewise, there are some functions there to deal with how the body, content type, and ETag of a resource can be streamed from and to the BlobTree storage.

Published under an MIT license by inrupt, Inc.

Contributors:
* Michiel de Jong
* Ruben Verborgh
* Kjetil Kjernsmo
* Jackson Morgan
* Pat McBennett
* Justin Bingham
* Sebastien Dubois
