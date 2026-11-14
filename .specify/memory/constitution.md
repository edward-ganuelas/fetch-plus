# fetch-plus Constitution

## Core Principles

### I. Fetch-Native Contract
The library MUST build on the platform Fetch API and preserve its established
request, response, and cancellation behavior. Any intentional difference or
extension MUST be documented and covered by tests. This keeps the library
predictable for developers who already use Fetch.

### II. Minimal Runtime Footprint
The production package MUST avoid runtime dependencies unless a user-facing
capability cannot reasonably be delivered without one; each runtime dependency
MUST have its need documented. The library MUST NOT perform network work or
create externally visible side effects until called by the consumer. This
keeps installations small and behavior explicit.

### III. Stable Package API
Every public export MUST be documented. The ESM and CommonJS entry points
declared by the package MUST provide equivalent supported behavior. Changes
that break the public API MUST follow semantic versioning and include migration
guidance.

### IV. Contract-Focused Testing
Changes to externally observable behavior MUST include focused tests for the
new behavior and relevant regressions. Tests that exercise HTTP behavior MUST
use a controlled mock boundary rather than depend on external services. This
makes the package contract verifiable and test runs repeatable.

### V. Type-Safe Builds
TypeScript source MUST pass the repository's strict compiler checks, and the
production build MUST succeed before changes are considered ready. Public API
changes MUST be checked against the package's declared distribution entry
points so source correctness does not mask a broken published package.

## Technical Constraints

The project MUST preserve the TypeScript and Vite library-build configuration
as the source of truth for compilation and distribution. The package metadata
MUST accurately describe the generated files and supported module entry
points. Any change to supported runtime environments or build targets MUST be
documented before relying on environment-specific behavior.

## Development Workflow

Before review, contributors MUST run the focused tests relevant to their
changes and the production build. Pull requests MUST describe user-visible API
changes, compatibility impact, and any required migration. Reviewers MUST
verify that changes comply with these principles and that exceptions are
explicitly justified in the pull request.

## Governance

This constitution governs project design and delivery decisions. Amendments
MUST be made by updating this document and MUST include a rationale and an
impact assessment. Reviewers MUST assess proposed changes for consistency
with the principles and identify any migration needed by existing consumers.

The constitution uses semantic versioning: MAJOR for backward-incompatible
governance changes, MINOR for new principles or materially expanded
requirements, and PATCH for clarifications and non-semantic refinements.
Compliance MUST be reviewed during pull-request review; a deviation MUST be
called out and justified before merge.

**Version**: 1.0.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
