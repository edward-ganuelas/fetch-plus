# Public Client Contract

This document describes the planned public behavior, not an implementation.
Supported behavior is limited to this contract and the feature specification.

## Browser Support and Package Formats

- Supported consumer runtimes are browsers with native Fetch and
  AbortController. No Node.js runtime support or polyfill support is promised.
- Preserve the package's ESM and CommonJS outputs with equivalent documented
  behavior. The CommonJS output is available to browser bundlers; its presence
  does not imply support for direct Node.js use.
- Browser support is defined by the required platform capabilities rather
  than a minimum browser-version list.

## Client Entry Points

- The default client is callable with a URL and optional request settings, or
  with a request configuration containing a URL.
- The default client exposes method helpers for `get`, `post`, `put`, `patch`,
  `delete`, `head`, and `options`.
- The default client can create an isolated configured client. Each client
  exposes the same call forms, method helpers, configuration defaults, and
  interceptor managers.
- GET-like helpers accept a URL and optional request settings. Body-capable
  helpers accept a URL, optional data, and optional request settings.

## Request Configuration

Supported settings are:

| Setting | Contract |
|---|---|
| `url` | Required for a request; may be absolute or relative to `baseURL` |
| `method` | Defaults to `GET` |
| `baseURL` | Joined with relative paths; absolute URLs bypass it |
| `headers` | Merged case-insensitively with client defaults |
| `params` | Scalar values and arrays; arrays serialize as repeated query keys |
| `data` | Per-request body; JSON-compatible objects serialize as JSON |
| `signal` | Caller-provided cancellation signal |
| `timeout` | Non-negative milliseconds; `0` disables the timeout |
| `withCredentials` | Explicit opt-in for eligible cross-origin credentials; defaults to false |

Effective settings use built-in defaults, then client defaults, then
request-level values. A request-level setting overrides its matching default
without mutating client configuration. Request body data is not inherited
from client defaults.

## Interceptors

Request and response interceptor managers expose:

- `use(fulfilled, rejected?)`, which registers a handler and returns an opaque
  identifier.
- `eject(id)`, which removes the matching handler; unknown identifiers have
  no effect.

Request interceptors execute in reverse registration order. Response
interceptors execute in registration order. A handler's result becomes the
next handler's input. HTTP failures are sent through response rejection
handlers; handler failures remain rejected unless a rejection handler handles
them.

## Successful Responses

Successful requests resolve to an object containing:

- `data`: parsed JSON, response text, or the empty string (`''`) for an empty
  body, including HEAD and 204 responses.
- `status`: numeric HTTP status.
- `statusText`: HTTP status text.
- `headers`: response headers.

Valid JSON is parsed for JSON media types. Non-JSON response bodies are text;
malformed JSON remains available as its original text. Empty HTTP error
response bodies likewise have `response.data` set to `''`.

## Errors

- By default, only 2xx HTTP responses resolve.
- An HTTP error exposes a `response` with `status`, `data`, and `headers`.
- Network, timeout, and caller-cancellation errors are distinguishable and
  have no fabricated `response`.
- The client does not promise every Axios error field, error code, or helper.

## Explicitly Out of Scope

The initial contract does not include complete Axios parity, custom transport
adapters, upload/download progress, automatic retries, caching, `CancelToken`,
arbitrary transforms, configurable status validation, or embedded-URL
credentials. Any future claim for these behaviors requires a specification
update.
