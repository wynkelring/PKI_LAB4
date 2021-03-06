const { Client } = require('pg');
const { google } = require('googleapis');
const OAuth2Data = require('./google_key.json');
const express         =     require('express')
  , passport          =     require('passport')
  , session			  =		require('express-session')
  , FacebookStrategy  =     require('passport-facebook').Strategy
  , config            =     require('./fb_config.js')
  , app               =     express();
const bodyParser = require('body-parser');
  
var path = __dirname + '/views/';


const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var authed = false;

const client = new Client({
	connectionString: process.env.DATABASE_URL,
});
client.connect();

const getUsers = (request, response) => {
	console.log('Pobieram dane ...');
	client.query('SELECT * FROM public."users" ORDER BY id', (error, res) => {
		if (error) {
			throw error	
		}
		console.log('Dostałem ...');
		for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}
	})
};

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.get('/login',function(req, res){
	if(!req.session.loggedin) {
		res.render('login');
	} else {
		res.redirect('/');
	}
});

app.post('/login', (req, res) => {
	var name = req.body.name;
	var date = new Date().getTime();
	client.query('SELECT * FROM public."users" WHERE name = $1', [name], (error, resultSelect) => {
		if (error) {
			throw error
		}
		if (resultSelect.rowCount == 1) {
			client.query('UPDATE public."users" SET lastvisit = $1, counter = counter + 1 WHERE name = $2', [date, name], (error, resultUpdate) => {
				if (error) {
					throw error
				}
				req.session.loggedin = true;
				req.session.username = name;
				res.redirect('/');
			})
		} else {
			res.redirect('/error');
		}
	})
}); 

app.get('/register',function(req, res){
	if(!req.session.loggedin) {
		res.render('register');
	} else {
		res.redirect('/');
	}
});

app.post('/register', (req, res) => {
	var name = req.body.name;
	var date = new Date().getTime();
	
	client.query('SELECT * FROM public."users" WHERE name = $1', [name], (error, resultSelect) => {
		if (error) {
			throw error
		}
		console.log(resultSelect);
		if (resultSelect.rowCount == 0) {
			client.query('INSERT INTO public."users" (name, joined, lastvisit) VALUES ($1, $2, $3)', [name, date, date], (error, results) => {
				if (error) {
					throw error
				}
				res.redirect('/login');
			})
		} else {
			res.redirect('/error');
		}
	})	
});

app.get('/logout',function(req, res){
	if(!req.session.loggedin) {
		res.redirect('/');
	} else {
		req.logout();
		req.session.destroy();
		res.redirect('/');
	}
});

app.get('/error',function(req, res){
	res.render('error');
});

app.get('/', (req, res) => {
	getUsers();
	client.query('SELECT * FROM public."users" ORDER BY id', (error, result) => {
		if (error) {
			res.render('index', {data: null, isConnected: false});
			throw error	
		}
		res.render('index', {data: result.rows, isConnected: true, loggedin: req.session.loggedin, name: req.session.username});
	})
});

app.get('/lab4', (req, res) => {
    res.send('<h1>PKI LAB4</h1><br>'.concat(
        '<p><a href="/googleLogin">Google LogIn</a></p>',
        '<p><a href="/auth/facebook">Facebook LogIn</a><br><a href="/auth/logout">Facebook LogOut</a></p>'));
});

app.get('/googleLogin', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile'
        });
        console.log(url)
        res.redirect(url);
    } else {
        const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
        oauth2.userinfo.v2.me.get((err, result) => {
            if (err) {
				return console.log('The API returned an error: ' + err);
			} else {
                loggedUser = result.data.name;
				console.log(loggedUser);
            }
			html = '<html><head><meta name="google-signin-client_id" content="745702520839-9k6tqtgs8t5mbs8cjnu39j0onhqe6l76.apps.googleusercontent.com"></head><body>'.concat(
				'Logged in: ', loggedUser,
				' <img src="', result.data.picture, '" height="23" width="23"><br>',
				'<script src="https://apis.google.com/js/platform.js?onload=onLoad" async defer></script>',
				'<script>function signOut() {var auth2 = gapi.auth2.getAuthInstance(); auth2.signOut().then(function () { console.log("User signed out.");});auth2.disconnect();}function onLoad() {gapi.load("auth2", function() {gapi.auth2.init();});}</script>',
				'<a href="#" onclick="signOut();">Sign out</a></body></html>');
			res.send(html);
        });
    }
});



app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect('/')
            }
        });
    }
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user)
});

passport.use(new FacebookStrategy({
    clientID: config.facebook_api_key,
    clientSecret: config.facebook_api_secret,
    callbackURL: config.callback_url
  },
  function(accessToken, refreshToken, user, done) {
	return done(null, user);
  }
));

app.get('/auth/facebook', passport.authenticate('facebook', {scope:"email"}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/account', failureRedirect: '/' }));

app.use('/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

const isAuthenticated = async (req, res, next) => {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/');
}

app.get('/account', isAuthenticated, (req, res) => {
    res.send(req.user._json);
});



const port = process.env.PORT || 5000
app.listen(port, () => console.log(`Server running at ${port}`));