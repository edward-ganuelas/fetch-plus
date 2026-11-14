# Research: Axios-Compatible Fetch Wrapper

**Date**: 2026-11-13

This research uses public Axios documentation and MDN Fetch documentation as
behavior references only. The implementation remains independently authored;
no Axios source code or private implementation details are used.

## Decisions

### 1. Use Fetch as the only transport

**Decision**: Execute one platform `fetch()` call per request, without runtime
transport dependencies, automatic retries, or hidden network activity.

**Rationale**: This preserves the project's Fetch-native constitution and
zero-runtime-dependency constraint. Fetch resolves normally for HTTP error
statuses, so the wrapper must inspect the response status and apply the
specified default 2xx policy itself.

**Alternatives considered**: Use an HTTP library or adapter layer; rejected
because it would add runtime dependencies and replace rather than wrap Fetch.

**References**: [Axios request methods](https://axios.rest/pages/advanced/request-method-aliases),
[MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch),
[Axios error handling](https://axios.rest/pages/advanced/error-handling)

### 2. Merge request configuration in explicit precedence order

**Decision**: Resolve built-in defaults first, then client defaults, then
request-level settings. Merge headers case-insensitively. Keep request data
per-call rather than inheriting it from client defaults.

**Rationale**: This follows the documented Axios precedence and isolates
separately configured clients. Per-call request data avoids accidentally
reusing a body on later requests.

**Alternatives considered**: Replace the entire client configuration for each
request; rejected because it discards useful client defaults and does not
match the expected client-instance behavior.

**References**: [Create an Axios instance](https://axios.rest/pages/advanced/create-an-instance),
[Axios config defaults](https://axios.rest/pages/advanced/config-defaults)

### 3. Join relative URLs to `baseURL`; leave absolute URLs alone

**Decision**: Bypass `baseURL` for absolute request URLs. For relative paths,
append the path to the configured base path with one slash between them,
including when the request path begins with `/`. Let URL parsing normalize
the final address. Treat `baseURL` as a convenience, not an origin security
boundary.

**Rationale**: The behavior matches the feature's requirement that a relative
URL be joined to the base URL. A leading slash must not silently discard the
configured base path.

**Alternatives considered**: Resolve every path with `new URL(path, baseURL)`;
rejected for joining because a leading slash replaces the base path. Exact
slash-joining and array-parameter formats are not fully specified in Axios
documentation, so the documented project contract is authoritative.

**References**: [Axios request config](https://axios.rest/pages/advanced/request-config),
[MDN URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)

### 4. Implement timeouts with an abort controller and cleanup

**Decision**: Treat timeout values as non-negative milliseconds; `0` disables
the timeout. Combine a request timeout with the caller's `AbortSignal`, and
clear timers and event listeners when the request settles. Distinguish timeout
from caller cancellation in the public error kind.

**Rationale**: Fetch has no native request timeout option. A controller and
timer provide a broadly supported path and can be cleaned up on both success
and failure. A native timeout signal is an alternative, but its availability
and active-time semantics vary by runtime.

**Alternatives considered**: Require `AbortSignal.timeout()`; rejected because
the project has no minimum runtime version and the helper cannot be cancelled
early. `CancelToken` is excluded by the feature specification.

**References**: [Axios request config](https://axios.rest/pages/advanced/request-config),
[Axios cancellation](https://axios.rest/pages/advanced/cancellation),
[MDN AbortSignal.timeout](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static),
[MDN AbortSignal.any](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static)

### 5. Require explicit opt-in for cross-origin credentials

**Decision**: Map `withCredentials: true` to Fetch's `credentials: "include"`.
When unset or false, preserve the Fetch same-origin default, which omits
credentials cross-origin. Do not attempt to bypass browser or server policy.

**Rationale**: This implements the user's explicit opt-in decision while
keeping cross-origin credential sending deliberate. CORS response headers and
cookie `SameSite` policy can still prevent credentials from being sent or
exposed.

**Alternatives considered**: Include cross-origin credentials by default;
rejected as an unsafe surprise. Expose all Fetch credential modes in the
initial API; rejected because the specification asks for an Axios-compatible
boolean opt-in.

**References**: [Axios request config](https://axios.rest/pages/advanced/request-config),
[MDN Request.credentials](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials),
[MDN Fetch credentials](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials)

### 6. Keep interceptor ordering and rejection behavior promise-like

**Decision**: Run request interceptors in reverse registration order and
response interceptors in registration order. Each fulfilled handler receives
the prior handler's result; rejected handlers receive failures. Provide
registration and ejection, scoped to each configured client.

**Rationale**: The ordering matches the documented Axios interceptor
behavior. Per-client managers prevent one configured client from mutating
another client's request pipeline.

**Alternatives considered**: Run both groups in registration order; rejected
because it conflicts with the expected request-interceptor order. Synchronous
interceptors and conditional `runWhen` are not in the feature scope.

**References**: [Axios interceptors](https://axios.rest/pages/advanced/interceptors)

### 7. Serialize query arrays as repeated keys and read response bodies once

**Decision**: Encode scalar query values with `URLSearchParams`, append array
values as repeated keys, retain existing URL query values, and omit nullish
values. Read each response body once as text; parse it as JSON when its media
type identifies JSON, retaining malformed JSON as its original text.

**Rationale**: This matches the feature specification and uses Fetch platform
primitives. Axios documentation does not define every array/nested-object
encoding, so the project's repeated-key rule is the stable contract.

**Alternatives considered**: Add a custom parameter serializer or nested
object encoding; rejected because neither is required for the initial scope.
Clone the response body and parse multiple times; rejected because response
bodies are one-shot streams and the extra buffering is unnecessary.

**References**: [Axios request config](https://axios.rest/pages/advanced/request-config),
[Axios response schema](https://axios.rest/pages/advanced/response-schema),
[MDN URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams),
[MDN Response.json](https://developer.mozilla.org/en-US/docs/Web/API/Response/json)

### 8. Support browsers only; define support by platform capabilities

**Decision**: Support browser runtimes with native Fetch and AbortController
only. Retain equivalent ESM and CommonJS package outputs for browser tooling;
do not claim Node.js runtime support or a minimum browser version.

**Rationale**: The user explicitly limited support to browsers. The repository
has no browser-version matrix; capability-based support avoids inventing an
unrequested version promise. The existing constitution requires equivalent
behavior from the declared ESM and CommonJS entry points, so the CommonJS
output remains for browser bundlers rather than constituting a Node support
promise. Node may run development tooling and tests without being a supported
consumer runtime.

**Alternatives considered**: Promise support for Node.js; rejected by the
user. Remove the CommonJS output; rejected because it conflicts with the
constitution and the user chose to retain both exports.

**References**: [TypeScript `lib` option](https://www.typescriptlang.org/tsconfig/lib.html),
[MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch),
[MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

### 9. Use a class-centered object-oriented design

**Decision**: Make a `FetchPlusClient` class own client defaults and request
methods. Use an `InterceptorManager` class for per-client interceptor state
and typed error classes for request failures. Keep stateless URL and
serialization operations as small helpers.

**Rationale**: This follows the user's preference for an object-oriented
codebase and gives each client a clear owner for its configuration and
interceptors without forcing every pure operation into a class.

**Alternatives considered**: A fully functional design with external
configuration records; rejected because it does not follow the requested
primary style. Classes for stateless formatting helpers; rejected as
unnecessary indirection.

## Error Behavior

Fetch rejects for request/network failures but resolves for HTTP statuses such
as 404. HTTP errors therefore carry a response object; network failures,
timeouts, and cancellations do not. Browser network and CORS errors are
intentionally opaque and must not be reported with a fabricated HTTP status.

The public contract will use a documented error discriminator rather than
claiming full compatibility with every Axios error code or helper.

**References**: [MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch),
[Axios error handling](https://axios.rest/pages/advanced/error-handling)

## Clean-Room Review

The implementation was independently authored for this project using the
public behavior references above, without Axios source or non-public
implementation materials. Supported behavior and explicit exclusions are
documented in the public client contract and the repository README.
