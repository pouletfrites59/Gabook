import express from "express"
import handlebars from "express-handlebars"
import fs from 'fs'
import $rdf from 'rdflib'
import ParsingClient from "sparql-http-client/ParsingClient.js"

var books = []
var users = []

//initialization of the web applciation
const client = new ParsingClient({
	endpointUrl: 'https://dbpedia.org/sparql'
})
const clientWikidata = new ParsingClient({
	endpointUrl: 'https://query.wikidata.org/sparql'
})

const app = express()

app.engine('hbs', handlebars.engine({defaultLayout: "main.hbs"}))
app.set("view engine", "hbs");
app.use(express.static("images"));

//route for css file
app.get("/layout.css", function(request, response) {
	response.sendFile("layout.css", {root: "."})
})

//route for book details page
app.get("/book/:id", async function(request, response) {
	const id = request.params.id
	const book = books.find(b => b.id == id)
	let picture = "/book_1.jpg"

	//get pictures of the book thanks to wikidata
	const query = `
	PREFIX wdt: <http://www.wikidata.org/prop/direct/>

	SELECT ?item ?picture
	WHERE
	{
		?item rdfs:label "${book.title}"@en;
				wdt:P18 ?picture.
	} LIMIT 1
	`

	await clientWikidata.query.select(query).then(rows => {
		rows.forEach(row => {
			picture = row.picture.value
		})
	})

	const model = {
		book: book,
		picture: picture,
	}
	response.render("book.hbs", model);
})


//route for recommended list of books
app.get("/books/:user_id", async function(request, response) {
	const id = request.params.user_id
	const picture_id = id.slice(0, -1) + (parseInt(id.substring(5)) - 1)
	const user = await users.find(u => u.id == id)
	books = []

	//preparation of langs and genre for the query
	var lang = "("
	user.lang.forEach(element => {
		lang = lang + "\'" + element + "\'@en,"
	});
	lang = lang.slice(0, -1) + ')'

	var genre = "("
	user.genre.forEach(element => {
		genre = genre + "dbr:" + element.replace(" ", "_") + ","
	});
	genre = genre.slice(0, -1) + ')'

	//SPARQL query to get list of recommended books on dbpedia
	const query = `
		SELECT * WHERE {
			?book a dbo:Book .
			?book dbo:author ?author . 
			?book dbo:literaryGenre ?genre .
			FILTER ( ?genre IN` + genre + `)

			?book dbp:language ?lang .
			FILTER ( ?lang IN` + lang + `)
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
				author: row.author.value.substring(28),
				lang: row.lang.value,
				genre: row.genre.value
			})
		})
	}).catch(error => {
		console.log(error)
	})
	const model = {
		books: books,
		picture: picture_id,
		user: user
	}
	response.render("books.hbs", model)
})

app.get("/", function(request, response) {
	response.render("home.hbs")
})

//route for display users profiles
app.get("/user_profiles", function(request, response) {
	//prepare informations for reading profiles
	var data=fs.readFileSync('users/user_profiles.rdf').toString();
	var store=$rdf.graph();
	var contentType='application/rdf+xml';
	var baseURI="http://example.com/demo";
	users = []

	var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/")
	var SCHEMA = $rdf.Namespace("http://schema.org/")

	$rdf.parse(data,store,baseURI,contentType);
    
	//read file and store profiles in a array
	for (let i = 0; i < 6; i++) {
		const user = store.sym(baseURI + '#user_' + (i + 1));
		users.push({
			id: "user_" + (i + 1),
			name: store.any(user, FOAF("name")).value,
			nick: store.any(user, FOAF("nick")).value,
			gender: store.any(user, FOAF("gender")).value,
			birthDate: store.any(user, SCHEMA("birthDate")).value,
			lang: store.any(user, SCHEMA("knowsLanguages")).value.split(","),
			genre: store.any(user, FOAF("interest")).value.split(",")
		})
	}
	const model = {
		users: users
	}

	var hbs = handlebars.create({});
	hbs.handlebars.registerHelper('isEven', function (value) {
		const nb = parseInt(value.substr(-1))
		return (nb%2) == 0;
	});
	response.render("user_profiles.hbs", model)
})

app.listen("3000")