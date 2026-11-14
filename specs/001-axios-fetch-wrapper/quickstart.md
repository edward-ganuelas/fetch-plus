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
Empty bodies, including HEAD, 204, and HTTP error responses, are checked for
the exact data value `''`.

Expected result: Vitest exits successfully with every contract scenario
passing.

## Validate the Production Package

```sh
npm run build
```

Expected result: strict TypeScript checking and the Vite library build both
complete successfully, producing the ESM and CommonJS entry points declared
by the package metadata, along with TypeScript declarations. The CommonJS
output is for browser bundlers and does not imply direct Node.js support.

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
claim. This source-entry smoke check alone does not establish package-format
parity. After building, use browser tooling to load the built ESM entry and
bundle the built CommonJS entry. Send the same controlled request through
each and compare `data`, `status`, `statusText`, and normalized headers.
T030 will add the runnable steps for this built-package comparison.

## Completion Check

- Both validation commands exit with status 0.
- The browser smoke test succeeds in each browser runtime claimed as
  supported.
- No HTTP test uses an external host.
- Built ESM and CommonJS package entry points return matching data, status,
  status text, and headers for the controlled browser request.
- Credential opt-in is tested as a request setting; browser and server CORS
  enforcement is not simulated by the Node mock server.
