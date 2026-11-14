# fetch-plus

A browser-only Fetch client with a callable, Axios-style request interface.
Browsers must provide native Fetch and AbortController; Node.js is not a
supported consumer runtime. ESM and CommonJS builds are provided for browser
tooling.

```js
import client from 'fetch-plus';

const response = await client('/api/items');
const created = await client.post('/api/items', { name: 'Example' });
```

The default export accepts a URL and optional options, or a configuration
object with `url`. It provides `get`, `post`, `put`, `patch`, `delete`,
`head`, and `options` methods. POST, PUT, and PATCH accept data before options;
the other helpers accept options after the URL. Helper methods select their
own method.

Create isolated clients with reusable defaults:

```js
const api = client.create({
    baseURL: 'https://api.example.com/v1',
    headers: { 'X-Client': 'example' },
    timeout: 5000,
});
const controller = new AbortController();
const response = await api.get('/items', {
    params: { tag: ['one', 'two'], active: false },
    signal: controller.signal,
});
```

Clients expose `defaults` and can create child clients that inherit a copy of
their defaults. `defaults.headers` is a `Headers` object. Request settings
override client defaults; headers merge case-insensitively and request data is
never a client default. Supported settings are `method`, `headers`, `data`,
`baseURL`, `params`, `signal`, `timeout`, and `withCredentials`. Query arrays
use repeated keys and nullish values are omitted. Absolute URLs bypass
`baseURL`.

Timeouts are non-negative finite milliseconds; `0` disables the timeout.
Cross-origin credentials are excluded by default; `withCredentials: true`
opts in subject to browser and server policy.

Each client has isolated `interceptors.request` and `interceptors.response`
managers. Register a fulfilled handler and optional rejection handler with
`use`, and remove it with `eject`:

```js
const id = api.interceptors.request.use((config) => {
    const headers = new Headers(config.headers);
    headers.set('X-Request-Source', 'browser');
    return { ...config, headers };
});
api.interceptors.request.eject(id);
```

Request handlers run in reverse registration order; response handlers run in
registration order. Handlers may return promises. Failures stay rejected
unless a later rejection handler explicitly returns a replacement value.
`use` returns an opaque identifier scoped to its manager. New child clients
do not inherit their parent's interceptors.

JSON-compatible object bodies are serialized as JSON; Fetch body types pass
through to the platform. ReadableStream uploads use half-duplex and require
native browser support for streaming requests. Responses expose `data`,
`status`, `statusText`, and `headers` (a `Headers` object). JSON media types
are parsed when valid,
malformed JSON remains text, and empty bodies return `''`.

HTTP, network, timeout, and caller-cancellation failures reject with a
`FetchPlusError` whose `kind` is respectively `'http'`, `'network'`,
`'timeout'`, or `'canceled'`. Only HTTP errors have a `response` containing
the status, data, status text, and headers. Configuration and interceptor
failures retain their original errors. The class is exported as a TypeScript
type; the runtime error can be recognized by its `name` and `kind`.

The package exports the TypeScript types `ClientDefaults`, `FetchPlusError`,
`FetchPlusResponse`, `HttpMethod`, `QueryParams`, `QueryScalar`,
`RequestConfig`, `RequestOptions`, and `ResolvedClientDefaults`.
Unsupported request options are rejected rather than ignored. Complete Axios
parity, custom adapters, progress events, automatic retries, caching,
`CancelToken`, arbitrary transforms, configurable status validation, and
embedded-URL credentials are outside the supported contract.

## Packaging

`npm pack` and `npm publish` run the test suite and build automatically before
creating the package. Both commands require the development dependencies.