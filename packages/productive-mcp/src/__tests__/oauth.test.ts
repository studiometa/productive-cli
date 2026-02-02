import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp, createRouter, toNodeListener } from 'h3';
import { createServer, type Server } from 'node:http';
import {
  oauthMetadataHandler,
  authorizeGetHandler,
  authorizePostHandler,
  tokenHandler,
} from '../oauth.js';
import { decodeAuthCode } from '../crypto.js';

describe('OAuth endpoints', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Set test secret
    process.env.OAUTH_SECRET = 'test-oauth-secret';

    // Create test app
    const app = createApp();
    const router = createRouter();
    router.get('/.well-known/oauth-authorization-server', oauthMetadataHandler);
    router.get('/authorize', authorizeGetHandler);
    router.post('/authorize', authorizePostHandler);
    router.post('/token', tokenHandler);
    app.use(router);

    // Start server
    server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /.well-known/oauth-authorization-server', () => {
    it('returns OAuth metadata', async () => {
      const response = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
      expect(response.ok).toBe(true);

      const metadata = await response.json();
      expect(metadata).toMatchObject({
        authorization_endpoint: expect.stringContaining('/authorize'),
        token_endpoint: expect.stringContaining('/token'),
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
      });
    });
  });

  describe('GET /authorize', () => {
    it('returns login form HTML', async () => {
      const response = await fetch(
        `${baseUrl}/authorize?client_id=test&redirect_uri=https://example.com/callback&state=abc123`
      );
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/html');

      const html = await response.text();
      expect(html).toContain('Connect to Productive.io');
      expect(html).toContain('Organization ID');
      expect(html).toContain('API Token');
      expect(html).toContain('User ID');
      expect(html).toContain('abc123'); // state in hidden field
    });
  });

  describe('POST /authorize', () => {
    it('redirects with authorization code on valid credentials', async () => {
      const response = await fetch(`${baseUrl}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          orgId: '12345',
          apiToken: 'pk_test123',
          userId: '67890',
          redirectUri: 'https://example.com/callback',
          state: 'test-state',
        }).toString(),
        redirect: 'manual',
      });

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toBeTruthy();

      const redirectUrl = new URL(location!);
      expect(redirectUrl.origin).toBe('https://example.com');
      expect(redirectUrl.pathname).toBe('/callback');
      expect(redirectUrl.searchParams.get('state')).toBe('test-state');
      expect(redirectUrl.searchParams.get('code')).toBeTruthy();

      // Verify the code contains our credentials
      const code = redirectUrl.searchParams.get('code')!;
      const decoded = decodeAuthCode(code);
      expect(decoded.orgId).toBe('12345');
      expect(decoded.apiToken).toBe('pk_test123');
      expect(decoded.userId).toBe('67890');
    });

    it('shows error when credentials are missing', async () => {
      const response = await fetch(`${baseUrl}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          redirectUri: 'https://example.com/callback',
        }).toString(),
      });

      expect(response.ok).toBe(true);
      const html = await response.text();
      expect(html).toContain('Organization ID and API Token are required');
    });

    it('shows error when redirectUri is missing', async () => {
      const response = await fetch(`${baseUrl}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          orgId: '12345',
          apiToken: 'pk_test',
        }).toString(),
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain('Missing redirect_uri parameter');
    });
  });

  describe('POST /token', () => {
    it('exchanges authorization code for access token', async () => {
      // First, get an authorization code
      const authResponse = await fetch(`${baseUrl}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          orgId: '12345',
          apiToken: 'pk_test123',
          userId: '67890',
          redirectUri: 'https://example.com/callback',
        }).toString(),
        redirect: 'manual',
      });

      const location = authResponse.headers.get('location')!;
      const code = new URL(location).searchParams.get('code')!;

      // Exchange code for token
      const tokenResponse = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
        }).toString(),
      });

      expect(tokenResponse.ok).toBe(true);
      const tokenData = await tokenResponse.json();

      expect(tokenData).toMatchObject({
        access_token: expect.any(String),
        token_type: 'Bearer',
      });

      // Verify the access token contains our credentials (base64 encoded)
      const decoded = Buffer.from(tokenData.access_token, 'base64').toString('utf-8');
      expect(decoded).toBe('12345:pk_test123:67890');
    });

    it('accepts JSON content type', async () => {
      // Get an authorization code
      const authResponse = await fetch(`${baseUrl}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          orgId: '12345',
          apiToken: 'pk_test',
          redirectUri: 'https://example.com/callback',
        }).toString(),
        redirect: 'manual',
      });

      const code = new URL(authResponse.headers.get('location')!).searchParams.get('code')!;

      // Exchange with JSON body
      const tokenResponse = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
        }),
      });

      expect(tokenResponse.ok).toBe(true);
      const tokenData = await tokenResponse.json();
      expect(tokenData.access_token).toBeTruthy();
    });

    it('rejects unsupported grant type', async () => {
      const response = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('unsupported_grant_type');
    });

    it('rejects missing code', async () => {
      const response = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_request');
    });

    it('rejects invalid code', async () => {
      const response = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: 'invalid-code',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_grant');
    });
  });
});
