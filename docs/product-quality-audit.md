# Product quality audit

Audit completed 2026-07-20 against the static development and production builds.

## Issue ledger

| Area                       | Problem and root cause                                                                                                           | Severity | Resolution                                                                                                      | Verification                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Reader and compiled output | The structured lesson title and an identical leading Markdown H1 were both rendered.                                             | High     | Remove only an identical leading lesson heading at the rendering boundary; source is unchanged.                 | Unit asset/render regression and browser journey.                            |
| Reader                     | Practice completion was stored but did not consistently style the activity card; empty question sets could complete prematurely. | High     | Centralized the completion badge and require actual completed questions.                                        | Unit grading coverage and reload journey.                                    |
| Routing                    | Push navigation retained the previous document scroll position.                                                                  | Medium   | Shared `ScrollManager` resets PUSH/REPLACE navigation, preserves POP behavior and anchors.                      | Chromium, Firefox, and mobile Playwright coverage.                           |
| Course detail              | Start Course used `window.location.href`, bypassing the configured router base path.                                             | High     | Use router navigation and preserve enrollment start time/last lesson.                                           | Browser journey and direct-route build checks.                               |
| Course detail              | Course covers were replaced by a letter placeholder even when source contained a cover.                                          | Medium   | Resolve source cover bytes to a scoped object URL with cleanup.                                                 | Production route walkthrough.                                                |
| Editor                     | Attached local media had no visual confirmation or preview.                                                                      | Medium   | Added image/audio/video previews with object URL cleanup.                                                       | Typecheck, lint, production build, manual DOM review.                        |
| Local media                | Validation rejected local references containing spaces, preventing compilation before asset copying.                             | High     | Parse full CommonMark destinations and strip optional titles/angle delimiters safely.                           | Byte-preservation regression test.                                           |
| Compiled artifact          | Leading duplicate lesson headings and local paths with spaces were not normalized consistently.                                  | High     | Apply the same heading and path rules in compiled output.                                                       | Compiled HTML assertions: exact bytes, portable path, no blob/localhost URL. |
| Mobile course cards        | Fixed `-2rem` cover margins exceeded responsive card padding, overlapping adjacent cards and intercepting taps.                  | High     | Derive cover margins from the shared responsive card-padding token.                                             | Full mobile Playwright journey.                                              |
| Mobile navigation          | Horizontal overflow made later top-level links unreliable to activate.                                                           | High     | Wrap navigation at narrow widths.                                                                               | Full mobile Playwright journey.                                              |
| Course cards               | Only the heading text was the primary action.                                                                                    | Low      | Make the complete card one semantic link with consistent hover/focus behavior.                                  | Keyboard and browser journey.                                                |
| Copy                       | Brand text overemphasized privacy and alternated between library/workspace/local-course language.                                | Medium   | Use learning library, course project, compilation, compiled artifact, preview, import, and export consistently. | Repository string audit and route walkthrough.                               |
| Loading/error state        | Lazy-route loading copy referred to a workspace.                                                                                 | Low      | Use direct “Loading page…” status and retain route-specific error/empty states.                                 | Route loading/build review.                                                  |
| Storage migration UI       | Blocked upgrades were logged but not actionable in the interface.                                                                | Medium   | Present an alert instructing users to close another tab and reload.                                             | Storage migration tests and event-path review.                               |
| Reduced motion             | Animation duration was constrained, but transitions were not.                                                                    | Low      | Preserve reduced-motion behavior and instant intentional scroll.                                                | CSS audit.                                                                   |

## Terminology

- **Learning library**: bundled courses available in Discover.
- **My Learning**: courses explicitly started by the learner.
- **Course project**: authored or imported editable source in My Courses.
- **Compilation**: a validation and build run.
- **Compiled artifact**: the downloadable Theoria ZIP produced by a compilation.
- **Preview**: opening source or compiled course data in the Theoria reader.
- **Import / export**: bringing MCF source into the browser / downloading portable source or output.
- **Lesson completion / progress**: persisted learner state for notes, practice, assessments, and
  lessons.

## Verification matrix

| Build              | Browser  | Viewport          | Result                                |
| ------------------ | -------- | ----------------- | ------------------------------------- |
| Development        | Chromium | Desktop           | Full journey and scroll tests passed. |
| Development        | Firefox  | Desktop           | Full journey and scroll tests passed. |
| Development        | Chromium | Pixel 7 emulation | Full journey and scroll tests passed. |
| Production preview | Chromium | Desktop           | Full journey and scroll tests passed. |
| Production preview | Firefox  | Desktop           | Full journey and scroll tests passed. |

Plain-HTTP LAN behavior and Brave-specific installation UI require testing on the user's network and
installed Brave browser. PWA installation over insecure LAN HTTP is intentionally not expected.
