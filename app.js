import express from "express"
import { engine } from "express-handlebars"
import fs from 'fs'
import $rdf from 'rdflib'
import ParsingClient from "sparql-http-client/ParsingClient.js"

var books = []

//GET ALL literaryGenre
//https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select+distinct+%3Fgenre+where+%7B%0D%0A++%5B%5D+dbo%3AliteraryGenre+%3Fgenre%0D%0A%7D&format=text%2Fhtml&timeout=30000&signal_void=on&signal_unconnected=on

const stringQuery = `
	SELECT * WHERE {
		?book a dbo:Book .
		?book dbo:author ?author . 
		?book dbo:literaryGenre dbr:Romantic_comedy .
		?book dbp:language "French"@en .

		?book rdfs:label ?title.
 		FILTER(LANGMATCHES(LANG(?title), 'en'))

		?book rdfs:comment ?description.
 		FILTER(LANGMATCHES(LANG(?description), 'en'))
	}
`

const client = new ParsingClient({
	endpointUrl: 'https://dbpedia.org/sparql'
})

const app = express()

app.engine('hbs', engine({defaultLayout: "main.hbs"}))
app.set("view engine", "hbs");
app.use(express.static("images"));

app.get("/layout.css", function(request, response) {
	response.sendFile("layout.css", {root: "."})
})

app.get("/book/:id", function(request, response) {
	const id = request.params.id
	
	const book = books.find(b => b.id == id) 
	const model = {
		book: book
	}
	response.render("book.hbs", model);
})

app.get("/books", async function(request, response) {
	const query = `
		SELECT * WHERE {
			?book a dbo:Book .
			?book dbo:author ?author . 
			?book dbo:literaryGenre dbr:Fantasy_literature .
			?book dbp:language "English"@en .
			?book dbp:pubDate ?date .

			?book rdfs:label ?title.
			FILTER(LANGMATCHES(LANG(?title), 'en'))

			?book rdfs:comment ?description.
			FILTER(LANGMATCHES(LANG(?description), 'en'))
		}
	`

	await client.query.select(query).then(rows => {
		rows.forEach(row => {
			books.push({
				id: row.title.value.toLowerCase().replaceAll(" ", "_"),
				title: row.title.value,
				date: row.date.value,
				description: row.description.value,
				author: row.author.value,
				lang: "English",
			})
		})
		
	}).catch(error => {
		console.log(error)
	})
	const model = {
		books: books
	}
	response.render("books.hbs", model)
})

app.get("/", function(request, response) {
	response.render("start.hbs")
})

app.get("/user_profiles", function(request, response) {
	//NEED REED .ttl

	response.render("user_profiles.hbs")
})

app.listen("8080")