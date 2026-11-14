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
and removal. The test fixture uses MSW 2 handlers.
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

Build a browser-importable bundle of the CommonJS entry, then start the
development server:

```sh
npm run build
npx --no-install esbuild dist/fetch-plus.umd.cjs --bundle --platform=browser --format=esm --outfile=dist/browser-smoke-cjs.js
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` in a supported browser and run the following in
the developer console. The CommonJS bundle is a temporary validation output
under the ignored `dist/` directory, not a package entry point.

```js
const esm = (await import('/dist/fetch-plus.js')).default;
const cjs = (await import('/dist/browser-smoke-cjs.js')).default;
const nativeResponse = await esm.get('/package.json');
const controlledUrl = 'data:application/json,%7B%22message%22%3A%22ok%22%7D';
const responses = await Promise.all([
    esm.get(controlledUrl),
    cjs.get(controlledUrl),
]);
const normalize = ({ data, status, statusText, headers }) => ({
    data, status, statusText, headers: Array.from(headers.entries()).sort(),
});
if (nativeResponse.status !== 200 || nativeResponse.data.name !== 'fetch-plus' ||
    responses[0].status !== 200 || responses[0].data.message !== 'ok' ||
    JSON.stringify(normalize(responses[0])) !== JSON.stringify(normalize(responses[1]))) {
    throw new Error('Browser package parity check failed');
}
console.log('Browser package parity check passed', normalize(responses[0]));
```

Expected result: the browser's native Fetch completes a same-origin HTTP
request and returns matching responses for the controlled data URL through
both built entries. The browser test exercises the supported runtime; the
Node-based Vitest runner does not constitute a Node.js support claim.

## Completion Check

- Both validation commands exit with status 0.
- The browser smoke test succeeds in each browser runtime claimed as
  supported.
- No HTTP test uses an external host.
- Built ESM and CommonJS package entry points return matching data, status,
  status text, and headers for the controlled browser request.
- Credential opt-in is tested as a request setting; browser and server CORS
  enforcement is not simulated by the Node mock server.
