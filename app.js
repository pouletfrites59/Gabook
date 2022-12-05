import express from "express"
import { engine } from "express-handlebars"
import fs from 'fs'
import $rdf from 'rdflib'

// const games = [{
// 	id: "super_mario_bros",
// 	name: "Super Mario Bros.",
// 	description: "A good game."
// }, {
// 	id: "the_legend_of_zelda",
// 	name: "The legend of Zelda",
// 	description: "A cool game."
// }]

const stringQuery = `
	SELECT 
		?id 
		?name 
		?description
	WHERE {
		?game a <http://gameverse.com/owl/games#Game> .
		?game a <http://gameverse.com/owl/games#Game> ?id .
		?game a <http://gameverse.com/owl/games#Game> ?name .
		?game a <http://gameverse.com/owl/games#Game> ?description .
	}
`

// const fs = require("fs")
// const $rdf = require("rdflib")

// const query = $rdf.SPARQLToQuery(stringQuery, false, store)

// const games = store.querySync(query).mqp(
// 	gameResult => {
// 		return {
// 			id: gameResult['?id'].value,
// 			name: gameResult['?name'].value,
// 			description: gameResult['?description'].value,
// 		}
// 	}
// )

const app = express()

app.engine('hbs', engine({defaultLayout: "main.hbs"}))
app.set("view engine", "hbs");
app.use(express.static("images"));

app.get("/layout.css", function(request, response) {
	response.sendFile("layout.css", {root: "."})
})

app.get("/games/:id", function(request, response) {
	const id = request.params.id
	const game = games.find(g => g.id == id)

	const model = {
		game: game
	}

	response.render("game.hbs", model);
})

app.get("/games", function(request, response) {
	const model = {
		games: games
	}
	response.render("games.hbs", model)
})

app.get("/", function(request, response) {
	response.render("start.hbs")
})

app.get("/about", function(request, response) {
	response.render("about.hbs")
})

app.listen("8080")