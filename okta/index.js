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
  const styles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        background: white;
        border-radius: 16px;
        padding: 48px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        text-align: center;
        max-width: 400px;
        width: 90%;
      }
      .avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        font-size: 32px;
        color: white;
        font-weight: bold;
      }
      h1 { color: #1a202c; font-size: 24px; margin-bottom: 8px; }
      p { color: #718096; margin-bottom: 24px; }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        transition: transform 0.2s, box-shadow 0.2s;
        margin: 6px;
      }
      .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .btn-secondary { background: #edf2f7; color: #4a5568; }
      .logo { font-size: 48px; margin-bottom: 24px; }
    </style>
  `;

  if (req.userContext) {
    const name = req.userContext.userinfo.name;
    const initial = name.charAt(0).toUpperCase();
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome - Okta Demo</title>
        ${styles}
      </head>
      <body>
        <div class="card">
          <div class="avatar">${initial}</div>
          <h1>Welcome back, ${name}!</h1>
          <p>You are successfully authenticated.</p>
          <a href="/protected" class="btn btn-primary">View Profile</a>
          <a href="/logout" class="btn btn-secondary">Logout</a>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - Okta Demo</title>
        ${styles}
      </head>
      <body>
        <div class="card">
          <div class="logo">&#128274;</div>
          <h1>Okta Demo App</h1>
          <p>Sign in to access your account</p>
          <a href="/login" class="btn btn-primary">Login with Okta</a>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/protected', oidc.ensureAuthenticated(), (req, res) => {
  const userInfo = req.userContext.userinfo;
  const tokens = req.userContext.tokens;

  // Decode JWT tokens (base64url decode the payload)
  const decodeJwt = (token) => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch (e) {
      return null;
    }
  };

  const idTokenDecoded = decodeJwt(tokens?.id_token);
  const accessTokenDecoded = decodeJwt(tokens?.access_token);

  // Claim explanations
  const claimDescriptions = {
    iss: 'Issuer - The authorization server that issued the token',
    sub: 'Subject - Unique identifier for the user',
    aud: 'Audience - Intended recipient(s) of the token',
    exp: 'Expiration - When the token expires',
    iat: 'Issued At - When the token was issued',
    auth_time: 'Auth Time - When the user last authenticated',
    nonce: 'Nonce - Random value to prevent replay attacks',
    amr: 'Auth Methods - How the user authenticated',
    idp: 'Identity Provider - The IdP that authenticated the user',
    jti: 'JWT ID - Unique identifier for this token',
    ver: 'Version - Token format version',
    at_hash: 'Access Token Hash - Hash of the access token',
    c_hash: 'Code Hash - Hash of the authorization code',
    name: 'Full Name - User\'s display name',
    preferred_username: 'Username - User\'s preferred login name',
    email: 'Email - User\'s email address',
    email_verified: 'Email Verified - Whether email was verified',
    locale: 'Locale - User\'s language/region preference',
    zoneinfo: 'Timezone - User\'s timezone',
    groups: 'Groups - Groups the user belongs to',
    scp: 'Scopes - Permissions granted to this token',
    cid: 'Client ID - The application that requested the token',
    uid: 'User ID - Okta\'s internal user identifier',
    given_name: 'First Name - User\'s given name',
    family_name: 'Last Name - User\'s family name',
    picture: 'Picture - URL to user\'s profile picture',
    updated_at: 'Updated At - When profile was last updated'
  };
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profile - Okta Demo</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 500px;
          width: 100%;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 32px;
          color: white;
          font-weight: bold;
        }
        h1 { color: #1a202c; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #718096; font-size: 14px; }
        .info-grid { margin-bottom: 32px; }
        .info-item {
          padding: 16px 0;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-item:last-child { border-bottom: none; }
        .info-label { color: #718096; font-size: 14px; }
        .info-value { color: #1a202c; font-weight: 500; }
        .actions { text-align: center; }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
          margin: 6px;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-secondary { background: #edf2f7; color: #4a5568; }
        .section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        .section-title {
          color: #1a202c;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          text-align: left;
        }
        .token-details summary {
          color: #718096;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 0;
        }
        .token-details summary:hover { color: #4a5568; }
        .token-details pre {
          background: #f7fafc;
          border-radius: 8px;
          padding: 16px;
          margin-top: 12px;
          overflow-x: auto;
          font-size: 12px;
          color: #2d3748;
          text-align: left;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .token-claim {
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }
        .token-claim:last-child { border-bottom: none; }
        .claim-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 4px;
        }
        .claim-name {
          color: #667eea;
          font-size: 12px;
          font-family: monospace;
          font-weight: 600;
        }
        .claim-value {
          color: #2d3748;
          font-size: 12px;
          word-break: break-all;
          text-align: right;
          flex: 1;
        }
        .claim-value.timestamp { color: #718096; font-style: italic; }
        .claim-desc {
          color: #a0aec0;
          font-size: 11px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="avatar">${userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}</div>
          <h1>${userInfo.name || 'User'}</h1>
          <p class="subtitle">Your Profile Information</p>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Name</span>
            <span class="info-value">${userInfo.name || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">${userInfo.email || userInfo.preferred_username || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Locale</span>
            <span class="info-value">${userInfo.locale || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Zone</span>
            <span class="info-value">${userInfo.zoneinfo || 'N/A'}</span>
          </div>
        </div>
        <div class="actions">
          <a href="/" class="btn btn-primary">Home</a>
          <a href="/logout" class="btn btn-secondary">Logout</a>
        </div>

        ${idTokenDecoded ? `
        <div class="section">
          <div class="section-title">ID Token Claims</div>
          <div class="token-claims">
            ${Object.entries(idTokenDecoded).map(([key, value]) => {
              const isTimestamp = ['iat', 'exp', 'auth_time', 'updated_at'].includes(key);
              const displayValue = isTimestamp
                ? new Date(value * 1000).toLocaleString() + ' (' + value + ')'
                : (typeof value === 'object' ? JSON.stringify(value) : value);
              const desc = claimDescriptions[key] || 'Custom claim';
              return `
                <div class="token-claim">
                  <div class="claim-header">
                    <span class="claim-name">${key}</span>
                    <span class="claim-value ${isTimestamp ? 'timestamp' : ''}">${displayValue}</span>
                  </div>
                  <div class="claim-desc">${desc}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${accessTokenDecoded ? `
        <div class="section">
          <div class="section-title">Access Token Claims</div>
          <div class="token-claims">
            ${Object.entries(accessTokenDecoded).map(([key, value]) => {
              const isTimestamp = ['iat', 'exp', 'auth_time', 'updated_at'].includes(key);
              const displayValue = isTimestamp
                ? new Date(value * 1000).toLocaleString() + ' (' + value + ')'
                : (typeof value === 'object' ? JSON.stringify(value) : value);
              const desc = claimDescriptions[key] || 'Custom claim';
              return `
                <div class="token-claim">
                  <div class="claim-header">
                    <span class="claim-name">${key}</span>
                    <span class="claim-value ${isTimestamp ? 'timestamp' : ''}">${displayValue}</span>
                  </div>
                  <div class="claim-desc">${desc}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <div class="section token-details">
          <details>
            <summary>View Raw Context JSON</summary>
            <pre>${JSON.stringify(req.userContext, null, 2)}</pre>
          </details>
        </div>
      </div>
    </body>
    </html>
  `);
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
