import express from 'express';
import session from 'express-session';
import pkg from '@okta/oidc-middleware';
import { getOktaSecrets } from './vault.js';
import dotenv from 'dotenv';

dotenv.config();

const { ExpressOIDC } = pkg;
const app = express();
const PORT = process.env.PORT || 8080;
const OKTA_DOMAIN = 'https://integrator-3920884.okta.com';

app.disable('x-powered-by');

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

let secrets;
try {
  secrets = await getOktaSecrets();
} catch (err) {
  console.error('Failed to retrieve Okta secrets from Vault:', err.message);
  process.exit(1);
}

const oidc = new ExpressOIDC({
  issuer: `${OKTA_DOMAIN}/oauth2/default`,
  client_id: secrets.client_id,
  client_secret: secrets.client_secret,
  appBaseUrl: `http://localhost:${PORT}`,
  redirect_uri: `http://localhost:${PORT}/authorization-code/callback`,
  scope: 'openid profile'
});

app.use(oidc.router);

app.get('/', (req, res) => {
  if (req.userContext) {
    res.send(`
      <p>Welcome, ${req.userContext.userinfo.name}!</p>
      <a href="/protected">View Profile</a> | <a href="/logout">Logout</a>
    `);
  } else {
    res.send('<a href="/login">Login with Okta</a>');
  }
});

app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(req.userContext, null, 2));
});

app.get('/logout', (req, res) => {
  const idToken = req.userContext?.tokens?.id_token;
  const postLogoutRedirectUri = `http://localhost:${PORT}`;

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    
    const logoutUrl = `${OKTA_DOMAIN}/oauth2/default/v1/logout?${
      idToken ? `id_token_hint=${idToken}&` : ''
    }post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

    res.redirect(logoutUrl);
  });
});

let server;

oidc.on('ready', () => {
  server = app.listen(PORT, () => console.log(`App running at http://localhost:${PORT}`));
});

oidc.on('error', err => {
  console.error('OIDC error:', err);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
