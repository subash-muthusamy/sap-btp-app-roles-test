const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 8080;

// Load xs-security.json to expose the role-templates and scopes
let xsSecurity = {};
try {
  xsSecurity = JSON.parse(fs.readFileSync('./xs-security.json', 'utf8'));
} catch (err) {
  console.warn('Could not read xs-security.json:', err.message);
}

// Helper: normalize scope entries to strings
function normalizeScopes(scopeClaim) {
  if (!scopeClaim) return [];
  if (Array.isArray(scopeClaim)) return scopeClaim;
  // sometimes scope can be space-separated string
  return String(scopeClaim).split(/\s+/).filter(Boolean);
}

// Map token scopes to role-templates: role is considered granted if ALL referenced scopes appear in token scopes
function grantedRolesFromTokenClaims(tokenPayload) {
  const tokenScopes = normalizeScopes(tokenPayload.scope || tokenPayload.scopes || tokenPayload['scp'] || []);
  const roleTemplates = xsSecurity['role-templates'] || [];
  return roleTemplates.map(rt => {
    const needed = (rt['scope-references'] || []).map(s => s.replace('$XSAPPNAME', xsSecurity.xsappname || ''));
    const granted = needed.every(ns => tokenScopes.includes(ns));
    return {
      name: rt.name,
      description: rt.description,
      scopeReferences: needed,
      granted: granted
    };
  });
}

app.get('/', (req, res) => {
  res.send({
    message: 'SAP BTP xs-security demo. Endpoints: /xs-security, /whoami',
    info: 'Create an XSUAA service using xs-security.json, assign role collections, then call /whoami with a Bearer token.'
  });
});

// Return the xs-security.json contents (so you can visually confirm the role-templates & scopes registered)
app.get('/xs-security', (req, res) => {
  res.json(xsSecurity);
});

// Endpoint to decode the incoming Bearer token and show mapping to role-templates
app.get('/whoami', (req, res) => {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'missing_token',
      message: 'Provide a Bearer token in Authorization header. Example: Authorization: Bearer <token>',
      hint: 'From CF CLI you can use: cf oauth-token'
    });
  }

  const token = auth.substring('Bearer '.length).trim();

  // NOTE: for this demo we decode without verifying the signature.
  // In production, validate tokens with the XSUAA jwks and proper library.
  let decoded;
  try {
    decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw new Error('Unable to decode token');
  } catch (err) {
    return res.status(400).json({ error: 'invalid_token', message: err.message });
  }

  const payload = decoded.payload || {};
  const header = decoded.header || {};

  const normalizedScopes = normalizeScopes(payload.scope || payload.scopes || payload['scp']);
  const roles = grantedRolesFromTokenClaims(payload);

  res.json({
    xsSecurity: xsSecurity,
    token: {
      header: header,
      payload: payload
    },
    normalizedScopes: normalizedScopes,
    grantedRoleTemplates: roles
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(`Endpoints: /xs-security  /whoami`);
});
