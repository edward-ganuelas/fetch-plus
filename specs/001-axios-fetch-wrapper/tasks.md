---
description: "Implementation tasks for the Axios-compatible Fetch wrapper"
---

# Tasks: Axios-Compatible Fetch Wrapper

**Input**: Design documents from `specs/001-axios-fetch-wrapper/`

**Prerequisites**: `plan.md`, `spec.md`; also use `research.md`, `data-model.md`,
`contracts/`, and `quickstart.md`.

**Tests**: Focused tests are required by the project constitution for changes
to observable behavior. Keep HTTP tests on controlled MSW handlers.

**Organization**: Tasks are grouped by the three prioritized user stories in
`spec.md`; each story is decomposed into small, independently verifiable
implementation slices.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Tasks can run in parallel because they touch different files and
  have no dependency on each other.
- **[Story]**: The user story served by a task (`US1`, `US2`, or `US3`).
- Every task names the file or files to change.

## Phase 1: Setup

**Purpose**: Make the existing test setup runnable and compatible with the
installed test-handler API.

- [X] T001 [P] Add a `"test": "vitest run"` script to `package.json` for a stable test command.
- [X] T002 [P] Replace MSW v1 `rest` handlers with MSW 2 `http` and `HttpResponse` handlers in `src/fetch-plus.test.js`, preserving scenarios: group basic requests under `describe('US1', ...)`, configuration under `describe('US2', ...)`, and errors/interceptors under `describe('US3', ...)`.

## Phase 2: Foundational

**Purpose**: Define shared types required by all client features.

**Checkpoint**: Complete setup and shared types before starting user stories.

- [X] T003 Define initial US1 `RequestConfig` and `HttpMethod` types plus response, client-default, interceptor callback, and request-error-kind types in `src/types.ts`; extend configuration types for later stories.

## Phase 3: User Story 1 - Make familiar HTTP requests (Priority: P1) 🎯 MVP

**Goal**: Let browser consumers make callable and method-based requests and
read consistent successful response values.

**Independent Test**: Run `npm test -- src/fetch-plus.test.js -t US1` and verify
URL-only and config calls plus GET and JSON POST succeed against MSW handlers,
returning the expected status and data without external network access. Full
US1 acceptance also requires the package parity check in T030 and T031.

### Tests and implementation for User Story 1

- [X] T004 [US1] Add tests under the `US1` group for URL-only invocation, config-object invocation, and default GET behavior in `src/fetch-plus.test.js`.
- [X] T005 [US1] Add tests under the `US1` group for GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS helper signatures in `src/fetch-plus.test.js`.
- [X] T006 [P] [US1] Implement JSON-compatible request-body serialization in `src/request.ts`, preserving caller content type and setting `application/json` only when absent.
- [X] T007 [P] [US1] Implement one-read response conversion in `src/response.ts`, parsing valid JSON for JSON media types, preserving malformed JSON as text, and returning non-JSON text or `''` for every empty body, including HEAD and 204.
- [X] T008 [US1] Implement `FetchPlusClient` default-GET dispatch and successful response construction using the helpers in `src/client.ts`.
- [X] T009 [US1] Add GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS methods in the `AxiosLike` base class in `src/axios-like.ts`, inherited by `FetchPlusClient` in `src/client.ts` and forwarding settings per `contracts/client-api.md`.
- [X] T010 [US1] Export the callable default-client facade and public request types from `src/main.ts`, delegating client state to `FetchPlusClient`.
- [X] T011 [US1] Complete P1 integration coverage under the `US1` group in `src/fetch-plus.test.js` for JSON request bodies, response `data`, `status`, `statusText`, and `headers`, and empty bodies returning `''`, including HEAD and 204 responses.

**Checkpoint**: The browser-facing default client can issue and parse the
specified basic requests using controlled handlers. Full US1 acceptance
remains pending the ESM/CommonJS browser parity check in T030 and T031.

## Phase 4: User Story 2 - Configure reusable clients and requests (Priority: P2)

**Goal**: Let consumers create isolated clients and configure headers, query
values, base URLs, timeouts, cancellation, and cross-origin credential opt-in.

**Independent Test**: Run `npm test -- src/fetch-plus.test.js -t 'US1|US2'` and verify two
clients retain isolated defaults, request values override defaults, and
base-URL, query, credential, timeout, and cancellation scenarios match the
acceptance criteria.

### Tests and implementation for User Story 2

Put all US2 tests in the `US2` group in `src/fetch-plus.test.js`.

- [ ] T012 [US2] Add tests for creating two clients, isolating their defaults, and applying request-level overrides in `src/fetch-plus.test.js`.
- [ ] T013 [P] [US2] Add client creation and per-instance default storage to `FetchPlusClient` in `src/client.ts`, exposing the configured-client factory from `src/main.ts`.
- [ ] T014 [P] [US2] Extend request/default configuration types in `src/types.ts` and implement precedence in `src/request.ts` (built-in, client, then request); merge headers case-insensitively and never inherit request `data`.
- [ ] T015 [US2] Add tests for relative and absolute `baseURL` handling and query values in `src/fetch-plus.test.js`.
- [ ] T016 [US2] Implement base-URL joining and query serialization in `src/request.ts`: join relative paths with one slash, leave absolute URLs unchanged, preserve existing query values, repeat array keys, preserve false and zero, and omit null and undefined.
- [ ] T017 [US2] Add tests for omitted cross-origin credentials by default and explicit credential opt-in in `src/fetch-plus.test.js`.
- [ ] T018 [US2] Map `withCredentials: true` to Fetch's `credentials: "include"` and keep the default cross-origin behavior off in `src/request.ts`, subject to browser and server policy.
- [ ] T019 [US2] Add tests for client and request timeouts, zero timeout, request-over-client precedence, and caller-signal cancellation in `src/fetch-plus.test.js`.
- [ ] T020 [US2] Implement timeout and caller-signal composition in `src/request.ts` and timeout/cancellation error kinds in `src/errors.ts`; validate non-negative finite timeout, `0` disables, and cleanup when requests settle.

**Checkpoint**: Two configured browser clients can be tested independently;
defaults, URL/query handling, credential policy, timeout, and cancellation
follow the contract.

## Phase 5: User Story 3 - Handle failures and response processing (Priority: P3)

**Goal**: Distinguish HTTP, network, timeout, and cancellation failures and
provide ordered, removable request and response interceptors.

**Independent Test**: Run `npm test -- src/fetch-plus.test.js` and verify
non-2xx responses expose an HTTP response, transport failures do not fabricate
one, and interceptor ordering, removal, and rejection behavior are correct.

### Tests and implementation for User Story 3

Put all US3 tests in the `US3` group in `src/fetch-plus.test.js`.

- [ ] T021 [US3] Add tests for default 2xx handling, HTTP error response fields including `''` data for an empty error body, and network failures without a fabricated response in `src/fetch-plus.test.js`.
- [ ] T022 [US3] Add tests under the `US3` group in `src/fetch-plus.test.js` for interceptor order, removal, per-client isolation, unhandled failures, and explicit recovery of HTTP and interceptor failures by later rejection handlers.
- [ ] T023 [P] [US3] Implement typed request errors in `src/errors.ts` for `http`, `network`, `timeout`, and `canceled` kinds; only HTTP errors carry a `response`.
- [ ] T024 [P] [US3] Implement the `InterceptorManager` class in `src/interceptors.ts` with registration, opaque IDs, ejection, and no-op behavior for unknown IDs.
- [ ] T025 [US3] Enforce the default 2xx status policy and construct HTTP errors with `response.status`, `response.data`, and `response.headers` in `src/response.ts`.
- [ ] T026 [US3] Classify rejected Fetch operations as network, timeout, or cancellation errors without attaching an HTTP response in `src/client.ts`.
- [ ] T027 [US3] Connect per-client interceptor managers to the request pipeline in `src/client.ts`, running request interceptors in reverse and response interceptors in registration order, propagating unhandled failures and allowing explicit rejection-handler recovery.

**Checkpoint**: The complete request lifecycle and all failure/interceptor
scenarios are independently verifiable with controlled handlers.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document browser-only support, verify module outputs, and run the
complete validation workflow.

- [ ] T028 [P] Document supported browser capabilities, public usage, compatibility boundaries, and the absence of Node.js runtime support in `README.md`.
- [ ] T029 [P] Configure explicit ESM and CommonJS-compatible browser-bundler outputs in `vite.config.ts` and verify the corresponding paths in `package.json`.
- [ ] T030 Update `specs/001-axios-fetch-wrapper/quickstart.md` with runnable browser smoke steps importing the built ESM entry and bundling the built CommonJS entry, issuing the same controlled request and comparing response data, status, status text, and headers; do not use Node.js execution as a runtime support test.
- [ ] T031 Run `npm test`, `npm run build`, and the browser smoke procedure in `specs/001-axios-fetch-wrapper/quickstart.md`; verify both entry points return matching data, status, status text, and headers and generated `dist/fetch-plus.js` and `dist/fetch-plus.umd.cjs` match `package.json`.
- [ ] T032 Review implementation files in `src/` and compatibility claims in `README.md` against the public references in `specs/001-axios-fetch-wrapper/research.md`; record the review outcome, confirming independent authorship, no non-public materials, and documented supported and excluded behavior.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 and T002 are independent and can run in parallel.
- **Foundational (Phase 2)**: T003 follows setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Starts after T003; delivers the MVP request path.
- **User Story 2 (Phase 4)**: Depends on the `FetchPlusClient` and callable
  facade from User Story 1.
- **User Story 3 (Phase 5)**: Depends on the client and configured-client
  foundation from User Stories 1 and 2.
- **Polish (Phase 6)**: Depends on all three user stories.

### User Story Dependencies

- **US1 (P1)**: Depends on shared types for the core request checkpoint;
  full acceptance additionally depends on the built-format browser parity
  validation in T030 and T031.
- **US2 (P2)**: Depends on US1's client dispatch and method helpers so it can
  add isolated configuration to a working client.
- **US3 (P3)**: Depends on US1's request pipeline and US2's per-client model
  so interceptor managers can be isolated per configured client.

### Parallel Opportunities

- **Setup**: T001 (`package.json`) and T002 (`src/fetch-plus.test.js`).
- **US1**: T006 (`src/request.ts`) and T007 (`src/response.ts`) after T004 and
  T005 establish the contract tests.
- **US2**: T013 (`src/client.ts`) and T014 (`src/request.ts`) after T012; the
  instance factory and configuration merge are separate modules.
- **US3**: T023 (`src/errors.ts`) and T024 (`src/interceptors.ts`) after T021
  and T022; the error and interceptor classes are separate modules.
- **Polish**: T028 (`README.md`) and T029 (`vite.config.ts`, `package.json`)
  can proceed independently after the stories.

### Parallel Execution Examples

#### User Story 1

```text
After T004 and T005:
Task: T006 Implement JSON request-body serialization in src/request.ts
Task: T007 Implement response parsing in src/response.ts
```

#### User Story 2

```text
After T012:
Task: T013 Add configured-client creation in src/client.ts and src/main.ts
Task: T014 Add configuration merging in src/request.ts
```

#### User Story 3

```text
After T021 and T022:
Task: T023 Add typed request errors in src/errors.ts
Task: T024 Add InterceptorManager in src/interceptors.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete setup and shared types.
2. Implement and independently test callable requests, method helpers, and
   JSON request/response handling.
3. Stop at the US1 checkpoint and run `npm test -- src/fetch-plus.test.js -t US1`.
4. Continue to client configuration after the MVP request path passes; do not
   mark all US1 acceptance complete until T030 and T031 verify package parity.

### Incremental Delivery

1. Complete US1 for a usable browser HTTP client.
2. Add US2 for isolated clients and common request configuration.
3. Add US3 for error classification and ordered interceptors.
4. Complete browser packaging, documentation, and full validation.

## Notes

- Every behavior task has a corresponding focused test task in its user story.
- `[P]` tasks operate on separate files and have no unresolved prerequisite.
- The test runner may use Node.js as development tooling; the library's
  supported consumer runtime remains browsers only.
- Do not add a runtime dependency or copy Axios implementation code.
