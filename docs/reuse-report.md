# Reuse and compatibility report

Theoria Core is a fresh browser-only application. `/home/apv/Theoria` is preserved as a read-only
design and documentation reference; none of its database or authentication work is reused.

## Authoritative sources

| Source              | Inspected commit                           | Reuse boundary                                                                             |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `mcf-npm`           | `01e8bb8aab135d99085c0a2fbbc19dea567bd24c` | Models, parser validation behavior, rich rendering, scoring, and compiler output semantics |
| `MCF-Specification` | `38827895ce171d683b5b71b67ee92e8a9fc69c85` | MCF 1.0 schema, ordering, fixtures, and normative behavior                                 |
| `mcf-python`        | `2236aeb408e3614a4c93f28cda0d040816046d53` | Cross-language parity reference only                                                       |

The upstream TypeScript parser and compiler directly import Node `fs` and `path`, so they cannot be
bundled for a static browser application. The browser compatibility layer preserves their pure
validation and rendering rules while replacing filesystem operations with a normalized virtual
filesystem. Upstream fixtures are retained as parity tests. The upstream reader UI is not copied.

## Course sources

Calculus I comes from the working `mcf-npm/examples/calculus-i` package. Ancient Egypt, Edgar Allan
Poe, History of Computer Science, and Basic Arithmetic use the newest candidates found across local
example trees and generated packages. The final candidates were selected only after parsing them;
this caught and replaced an older invalid Basic Arithmetic package. Their MCF source and attribution
files are preserved. Theoria-only subject, difficulty, featured, and added-date metadata lives in a
separate catalog.
