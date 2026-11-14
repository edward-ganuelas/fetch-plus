# Implementation Plan: Axios-Compatible Fetch Wrapper

**Branch**: `001-axios-fetch-wrapper` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-axios-fetch-wrapper/spec.md`

## Summary

Build a clean-room, browser-only TypeScript HTTP client that delegates requests
to the platform Fetch API while providing the compatibility behaviors
committed in the specification: callable and method-based requests,
configured client instances, request defaults, base URLs, timeouts, explicit
cross-origin credential opt-in, interceptors, Axios-style responses, and
inspectable HTTP errors. Use a class-centered object-oriented design, keep the
runtime dependency footprint at zero, and validate behavior with controlled
HTTP tests plus browser smoke checks and the TypeScript/Vite production build.
Use instance defaults before per-request settings, append relative paths to
base URLs while allowing absolute URLs to bypass them, map credential opt-in
to Fetch's `include` mode, and compose timeout aborts with caller cancellation.

## Technical Context

**Language/Version**: TypeScript 5.9, targeting ES2022 with strict compiler checks

**Primary Dependencies**: Native Fetch, URL, and AbortController; no runtime
packages. Development dependencies include Vite 7, Vitest 4, and MSW 2.

**Storage**: None; client defaults and interceptors exist only in process.

**Testing**: Vitest with MSW 2 for controlled request/response behavior,
executed by Node as development tooling only; browser smoke checks validate
the supported runtime. `npm run build` validates TypeScript and Vite output.

**Target Platform**: Browser runtimes that provide native Fetch and
AbortController. No minimum browser-version matrix or polyfill support is
promised. Node is not a supported runtime.

**Project Type**: Browser-consumed TypeScript library; retain equivalent ESM
and CommonJS outputs for browser tooling

**Performance Goals**: No numeric latency or throughput target is specified.
The wrapper MUST avoid retries or additional network requests unless explicitly
requested by a future specification.

**Constraints**: Clean-room implementation based only on public behavior
references; preserve platform Fetch semantics; no runtime dependencies;
maintain strict TypeScript checks and the ESM/CommonJS package entry points.
The design MUST be primarily object-oriented. Cross-origin credentials
require explicit opt-in and remain subject to browser and server policy.

**Scale/Scope**: In-process client instances with per-instance defaults; no
persistent data, server-side service, or request-volume guarantee. Initial
compatibility is bounded by the behaviors and exclusions in the feature spec.

## Constitution Check

**Pre-design gate: PASS**

- **Fetch-Native Contract**: The design delegates transport to native Fetch,
  uses caller-provided cancellation, and documents wrapper-specific behavior.
- **Minimal Runtime Footprint**: The design requires no production dependency
  and performs no network work before a caller invokes the client.
- **Stable Package API**: Public behavior is documented and the existing ESM
  and CommonJS export paths remain behaviorally equivalent for browser
  tooling; no Node.js runtime support is claimed.
- **Contract-Focused Testing**: Network behavior is validated through
  controlled mocks, including failures and compatibility cases.
- **Type-Safe Builds**: Strict TypeScript checks and the production build are
  required before completion.
- **Technical Constraints and Workflow**: The existing TypeScript/Vite
  library setup is preserved; focused tests and build are review gates.

**Post-design gate: PASS**

- `research.md` records only public behavior references and preserves the
  clean-room constraint.
- `data-model.md` defines in-process clients, request settings, responses,
  interceptor behavior, and error categories without persistent storage.
- `contracts/client-api.md` documents the supported surface and explicit
  exclusions; no unrequested runtime or transport layer is added.
- `quickstart.md` validates the contract using controlled network tests and
  the existing build, without external services; browser smoke checks cover
  the supported runtime.
- The design preserves Fetch cancellation and credential policy, strict
  TypeScript checks, and equivalent ESM/CommonJS behavior for browser
  tooling; it does not claim Node.js support. Stateful client and interceptor
  behavior is class-centered, with small helpers for stateless operations.
  No constitution violations or unjustified complexity were identified.

## Project Structure

### Documentation (this feature)

```text
specs/001-axios-fetch-wrapper/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── client-api.md
```

### Source Code (repository root)

```text
src/
├── main.ts
├── client.ts
├── request.ts
├── response.ts
├── interceptors.ts
├── errors.ts
├── types.ts
└── fetch-plus.test.js
```

**Structure Decision**: Keep the existing single-package library layout and
`src/main.ts` as the Vite library entry point. Center the public client on a
`FetchPlusClient` class that owns per-client defaults and interceptor
managers; use an `InterceptorManager` class and typed error classes for
stateful behavior. Keep URL and body serialization as small focused helpers
where objects add no value. A thin callable facade preserves the requested
client call form. Extend the existing controlled-request test file, update its
handlers to MSW 2, and add browser smoke validation without adding a runtime
dependency or promising Node support.

## Complexity Tracking

No constitution violations or additional projects are proposed.
