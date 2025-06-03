import express from 'express';
import session from 'express-session';
import pkg from '@okta/oidc-middleware';
const { ExpressOIDC } = pkg;
const app = express();

app.use(session({
  secret: 'long-random-secret',
  resave: true,
  saveUninitialized: false
}));

const oidc = new ExpressOIDC({
  issuer: 'https://dev-12623742.okta.com/oauth2/default',
  client_id: '',
  client_secret: '',
  appBaseUrl: 'http://localhost:8080',
  redirect_uri: 'http://localhost:8080/authorization-code/callback',
  scope: 'openid profile'
});

app.use(oidc.router);

app.get('/', (req, res) => {
  res.send('<a href="/login">Login with Okta</a>');
});

app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
  res.send(`Hello ${req.userContext.userinfo.name}`);
});

app.get('/logout', (req, res) => {
  const idToken = req.userContext?.idToken;

  req.session.destroy(() => {
    const oktaDomain = 'https://dev-12623742.okta.com';
    const postLogoutRedirectUri = 'http://localhost:8080';

    const logoutUrl = `${oktaDomain}/oauth2/default/v1/logout?${idToken ? `id_token_hint=${idToken}&` : ''}post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

    res.redirect(logoutUrl);
  });
});


oidc.on('ready', () => {
  app.listen(8080, () => console.log('App running at http://localhost:8080'));
});

oidc.on('error', err => {
  console.error('OIDC error:', err);
});
