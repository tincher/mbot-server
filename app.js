const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const csv = require('csvtojson')
var passport = require('passport')
var Strategy = require('passport-local').Strategy;
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn

const skucsvpath = 'C:/Users/jojoe/Desktop/projects/manne/skus.csv'


var users = require('./users.json')
passport.use(new Strategy(
	function (username, password, cb) {
		let user = JSON.parse('{"username":"' + username + '","password":"' + password + '"}')
		users.forEach(element => {
			if (element.username === username) {
				if (element.password === password) {
					return cb(null, user)
				}
			}
			return cb(null, false)
		});
	}
));
passport.serializeUser(function (user, cb) {
	cb(null, user.username);
});
passport.deserializeUser(function (id, cb) {
	users.forEach(element => {
		if (element.username === id) {
			return cb(null, element)
		}
	})
});

const app = express();
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(express.static('mbot-site'));

app.listen(3000, () => console.log('MBot listening on port 3000!'));


app.get('/test', (req, res) => {
	res.send('success')
})

app.get('/authtest',
	ensureLoggedIn('/'),
	function (req, res) {
		res.send('success2')
	});

app.post('/login',
	passport.authenticate('local', {
		failureRedirect: '/'
	}),
	function (req, res) {
		res.redirect('/authtest');
	});

app.get('/getskus',
	ensureLoggedIn('/'),
	(req, res) => {
		csv({
			noheader: true
		}).fromFile(skucsvpath).then((jsonObj) => {
			console.log(jsonObj);
			res.send(jsonObj)
		})
	})
app.post('/addsku',
	ensureLoggedIn('/'),
	(req, res) => {
		console.log(req.body);
	});

app.get('/logout',
	function (req, res) {
		req.logout();
		res.redirect('/');
	});