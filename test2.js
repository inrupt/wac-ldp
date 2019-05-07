const turtleText = `@base <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rel: <http://www.perceive.net/schemas/relationship/> .

<#green-goblin>
    rel:enemyOf <#spiderman> ;
    a foaf:Person ;    # in the context of the Marvel universe
    foaf:name "Green Goblin" .
`

const sparqlQuery = `PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
SELECT ?name
WHERE {
  ?person foaf:name ?name .
}`

const result = executeQuery(turtleText, sparqlQuery)
expect(result).toEqual(`@base <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<#green-goblin>
    foaf:name "Green Goblin" .
`)
