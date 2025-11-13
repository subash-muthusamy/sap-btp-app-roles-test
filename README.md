# SAP BTP CF: demo app for xs-security.json roles & scopes

This repository contains a minimal Node.js app that demonstrates how role-templates and scopes defined in xs-security.json are used in SAP BTP (Cloud Foundry) applications. It decodes the incoming JWT (from XSUAA) and shows which role-templates from xs-security.json the token grants.

Files included:
- xs-security.json — the roles and scopes you want to test
- package.json — Node.js metadata and dependencies
- server.js — the app (Express) that decodes tokens and shows role mappings
- manifest.yml — sample CF manifest (replace service name placeholder)
- .cfignore — optional

Quick overview:
- Create an XSUAA service instance using xs-security.json (this registers the roles & scopes).
- Push the app and bind the XSUAA service instance.
- In the BTP cockpit (or using CLI), create Role Collections and assign role-templates to those collections, then assign the role collection to a user.
- Request a token (or use browser SSO) and call the /whoami endpoint to see which role-templates from xs-security.json the token grants.

Commands (example):
1. Create XSUAA service using local xs-security.json:
   cf create-service xsuaa application my-xsuaa -c xs-security.json

2. Push the app (ensure manifest.yml services entry matches the created service name):
   cf push

   If you didn't add the service to the manifest, bind it and restage:
   cf bind-service <your-app-name> my-xsuaa
   cf restage <your-app-name>

3. Assign Role Collections to users:
   - Open SAP BTP cockpit > Spaces > your space > Services > XSUAA instance > Manage > Role Collections
   - Create role collections that include the role-templates defined in xs-security.json (Display, Editor, Administrator).
   - Assign the role collection(s) to test users.

4. Call the app:
   - If you are testing from the CF CLI, you can pass the CF CLI token:
     curl -H "Authorization: Bearer $(cf oauth-token)" https://<your-app-route>/whoami

   - Or authenticate a browser user (via an OAuth flow) and call /whoami. The app will show the decoded token and how role-templates map.

Notes:
- This demo decodes the token without verifying its signature to keep it minimal and focused on showing scopes and role mapping. In production you should validate the token (use the jwks uri from the XSUAA binding and proper libraries such as @sap/xssec or passport strategies).
- Replace placeholders (service name, app name) in manifest.yml as suitable.

If you want, I can provide an updated server.js that performs signature verification using the XSUAA's JWKS and enforces role-based access on endpoints (for example, /admin only accessible to Administrator role.
