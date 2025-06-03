import express from 'express';
import session from 'express-session';
import pkg from '@okta/oidc-middleware';
import { getOktaSecrets } from './vault.js';
const { ExpressOIDC } = pkg;
const app = express();

app.use(session({
  secret: 'long-random-secret',
  resave: true,
  saveUninitialized: false
}));

const secrets = await getOktaSecrets();

const oidc = new ExpressOIDC({
  issuer: 'https://dev-12623742.okta.com/oauth2/default',
  client_id: secrets.client_id,
  client_secret: secrets.client_secret,
  appBaseUrl: 'http://localhost:8080',
  redirect_uri: 'http://localhost:8080/authorization-code/callback',
  scope: 'openid profile'
});
app.use(oidc.router);

app.get('/', (req, res) => {
  res.send('<a href="/login">Login with Okta</a>');
});

app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(req.userContext, null, 2));
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

oidc.on('ready', () => {
  app.listen(8080, () => console.log('App running at http://localhost:8080'));
});

oidc.on('error', err => {
  console.error('OIDC error:', err);
});
