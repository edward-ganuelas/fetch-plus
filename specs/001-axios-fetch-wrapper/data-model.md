# Data Model: Axios-Compatible Fetch Wrapper

The client is a browser-only, in-process library. It stores no user or request
data persistently; the entities below exist only while the caller uses the
client and during each request. Node may run development tools and tests, but
Node.js is not a supported consumer runtime.

## Configured Client

An independently configured callable `FetchPlusClient` object with:

- Default request settings.
- A request interceptor collection.
- A response interceptor collection.

Each client object owns its settings and interceptor managers. Creating or
changing one client MUST NOT change another client's configuration or request
pipeline.

The object-oriented design centers stateful behavior in client and interceptor
manager classes. Stateless URL and serialization operations remain small
helpers rather than introducing classes without owned state.

## Request Configuration

Describes one operation sent through a client.

| Field | Meaning | Validation and default |
|---|---|---|
| `url` | Absolute or client-relative destination | Required |
| `method` | HTTP method | Defaults to `GET`; method helpers supply their method |
| `baseURL` | Prefix for relative request paths | Inherited from client defaults; ignored for absolute URLs |
| `headers` | Request metadata | Case-insensitive names; request values override matching defaults |
| `params` | Query values | Scalars and arrays; arrays become repeated keys; nullish values are omitted |
| `data` | Request body | Per-request only; JSON-compatible objects are serialized as JSON |
| `signal` | Caller cancellation signal | Optional; cancellation rejects without an HTTP response |
| `timeout` | Maximum request duration in milliseconds | Inherited from client; `0` disables timeout; negative or non-finite values are invalid |
| `withCredentials` | Cross-origin credential opt-in | Defaults to false; true requests eligible credentials subject to platform policy |

Configuration precedence is built-in defaults, client defaults, then
request-level values. Request-level values override matching client values
without mutating the client defaults. Header collections merge by
case-insensitive name. Request data is never inherited from client defaults.

## Interceptor

A caller-registered handler managed by that client's `InterceptorManager`.

| Attribute | Meaning |
|---|---|
| `id` | Opaque identifier returned when the handler is registered |
| `fulfilled` | Processes the current request or response value |
| `rejected` | Handles a failure in the corresponding pipeline |
| `stage` | Request or response processing |

Request handlers run last-in/first-out; response handlers run first-in/first-
out. Ejecting an identifier removes only that client's matching handler.

## Response

The result of a completed HTTP exchange:

| Field | Meaning |
|---|---|
| `data` | Parsed JSON value, text body, or `''` for an empty body, including HEAD and 204 responses |
| `status` | HTTP status code |
| `statusText` | HTTP status text |
| `headers` | Response headers |

Each body is consumed once. JSON media types are parsed when valid; malformed
JSON remains available as text. Other media types are returned as text in the
initial compatibility scope. Empty HTTP error response bodies also have
`response.data` set to `''`.

## Request Error

A rejected request is distinguished by its documented `kind`:

| Kind | Cause | HTTP response |
|---|---|---|
| `http` | A received status outside the default 2xx range | Present with status, data, and headers |
| `network` | Fetch failed before an HTTP response was available | Absent |
| `timeout` | The request exceeded its configured timeout | Absent |
| `canceled` | The caller's signal cancelled the request | Absent |

The wrapper MUST NOT infer an HTTP response for network, timeout, or
cancellation failures. Browser CORS and network failures may not reveal their
underlying cause; they remain classified as network failures unless the
wrapper's own timeout or caller signal identifies the abort reason.

## Request Lifecycle

1. Select the configured client and merge defaults with request settings.
2. Resolve the base URL and query values.
3. Run request interceptors.
4. Send one Fetch request, with timeout and cancellation handling.
5. Read the response body once and create the response value.
6. Resolve or reject according to the default 2xx status rule.
7. Run response interceptors and settle the caller's promise.

Interceptor, serialization, and request failures enter the applicable
rejection chain and remain rejected unless a later rejection interceptor
explicitly handles the failure and returns a fallback value. A failure MUST
NOT be silently converted into a successful response.
