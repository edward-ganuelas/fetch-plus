# Quickstart: Validate the Fetch Wrapper

This guide is the end-to-end validation checklist for the implementation.
Run it from the repository root after implementation is complete.

## Prerequisites

- Node.js and npm.
- A supported browser with native Fetch and AbortController.
- Dependencies installed from the repository lockfile.

Node.js is used only for development tooling and tests; it is not a supported
consumer runtime.

## Setup

```sh
npm ci
```

## Run Contract Tests

```sh
npx vitest run src/fetch-plus.test.js
```

The tests MUST use controlled HTTP handlers and MUST NOT contact external
services. They cover callable and method-based requests, request config,
query values, JSON bodies, response parsing, HTTP failures, client defaults,
base URLs, timeout/cancellation, credential settings, and interceptor order
and removal. The existing test fixture uses an older MSW API and must be
updated to the installed MSW 2 handlers as part of implementation.

Expected result: Vitest exits successfully with every contract scenario
passing.

## Validate the Production Package

```sh
npm run build
```

Expected result: strict TypeScript checking and the Vite library build both
complete successfully, producing the ESM and CommonJS entry points declared
by the package metadata. The CommonJS output is for browser bundlers and does
not imply direct Node.js support.

## Smoke-Test in a Browser

Start the development server:

```sh
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` in a supported browser and run this in the
developer console:

```js
const { default: client } = await import('/src/main.ts');
const response = await client.get('/package.json');
console.assert(response.status === 200);
console.assert(response.data.name === 'fetch-plus');
```

Expected result: the browser's native Fetch completes a same-origin request
and returns the package metadata. The browser test exercises the supported
runtime; the Node-based Vitest runner does not constitute a Node.js support
claim. Browser tooling that consumes the CommonJS output must expose the same
documented client behavior as the ESM output.

## Completion Check

- Both validation commands exit with status 0.
- The browser smoke test succeeds in each browser runtime claimed as
  supported.
- No HTTP test uses an external host.
- ESM and CommonJS package entry points expose equivalent supported behavior.
- Credential opt-in is tested as a request setting; browser and server CORS
  enforcement is not simulated by the Node mock server.
