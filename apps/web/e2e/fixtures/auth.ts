import { test as base } from '@playwright/test';
import { encode } from '@auth/core/jwt';

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:4000';
const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
// NextAuth v5 on HTTP (localhost) uses the unprefixed cookie name
const SESSION_COOKIE = 'authjs.session-token';

export type AuthFixtures = {
  authedPage: import('@playwright/test').Page;
  userId: string;
};

type InternalFixtures = {
  _authSession: { page: import('@playwright/test').Page; userId: string };
};

export const test = base.extend<AuthFixtures & InternalFixtures>({
  _authSession: async ({ browser }, use) => {
    // Create a test user via the server's test-only /test/login endpoint.
    // The server must be started with LOAD_TEST=1 for this route to be accessible.
    const loginRes = await fetch(`${SERVER_URL}/test/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ testId: 'playwright-e2e' }),
    });
    if (!loginRes.ok) {
      throw new Error(
        `[auth fixture] POST /test/login failed: ${loginRes.status}. ` +
        'Start the server with LOAD_TEST=1 to enable the test login endpoint.',
      );
    }
    const { userId, dongCode } = (await loginRes.json()) as {
      userId: string;
      dongCode: string;
    };

    // Encode a NextAuth v5 JWE session token with the same secret/salt the app uses.
    const token = await encode({
      token: { sub: userId, id: userId, dongCode },
      secret: AUTH_SECRET,
      salt: SESSION_COOKIE,
    });

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
      // Suppress the /welcome redirect — mark user as having visited before
      { name: 'mf_visited', value: '1', domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();
    await use({ page, userId });
    await context.close();
  },

  authedPage: async ({ _authSession }, use) => {
    await use(_authSession.page);
  },

  userId: async ({ _authSession }, use) => {
    await use(_authSession.userId);
  },
});

export { expect } from '@playwright/test';
