const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json')

const app = express()

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

app.get('/', (req, res) => {
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
			head = '<html><head><meta name="google-signin-client_id" content="745702520839-9k6tqtgs8t5mbs8cjnu39j0onhqe6l76.apps.googleusercontent.com"></head>';
			gapi = '<script src="https://apis.google.com/js/platform.js?onload=onLoad" async defer></script>';
			script = '<script>function signOut() {var auth2 = gapi.auth2.getAuthInstance(); auth2.signOut().then(function () { console.log("User signed out.");});auth2.disconnect();}function onLoad() {gapi.load("auth2", function() {gapi.auth2.init();});}</script>';
			logOut = '<a href="#" onclick="signOut();">Sign out</a>';
			res.send(''.concat(head, '<body>Logged in: ', loggedUser, ' <img src="', result.data.picture, '" height="23" width="23"><br>', script, gapi, logOut, '</body></html>'));
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

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`Server running at ${port}`));