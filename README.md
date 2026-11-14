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
the other helpers accept options after the URL. Supported options are
`method`, `headers`, and `data`. Helper methods select their own method.

JSON-compatible object bodies are serialized as JSON; Fetch body types pass
through to the platform. ReadableStream uploads use half-duplex and require
native browser support for streaming requests. Responses expose `data`,
`status`, `statusText`, and `headers` (a `Headers` object). JSON media types
are parsed when valid,
malformed JSON remains text, and empty bodies return `''`. Non-2xx responses
reject with an error; structured HTTP errors are not yet available.

The package exports the TypeScript types `FetchPlusResponse`, `HttpMethod`,
`RequestConfig`, and `RequestOptions`. Configured clients, query parameters,
timeouts, cancellation, credential options, and interceptors are not yet
implemented. Unsupported request options are rejected rather than ignored.