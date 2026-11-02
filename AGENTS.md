# Agent instructions

Every change must run `yarn verify` from the repository root before you treat the work as done. Pass is exit code 0 and a final line `verify-runifly: PASS`. `yarn verify` runs the unit tests, lint, the production build, and the browser journey in `.cursor/skills/verify-runifly/`. Do not lower the react-doctor or aislop score.

`yarn doctor` and `yarn aislop` are advisory. The GitHub Actions job `Quality scores` runs both, prints the output, and writes it to the job summary. Both steps set `continue-on-error`, so a low score or a non-zero exit does not fail the build. A later pull request will raise both scores to 100 and turn that job into a hard gate. This change only records the baseline. Do not fix score findings in an unrelated change, and do not silence rules, exclude source files, or shrink either scan to move a number.

## react-doctor

`yarn doctor` is `react-doctor --no-score --no-supply-chain --blocking none --yes` (react-doctor 0.9.21). `doctor.config.json` sets the same offline policy: `noScore`, `share: false`, `blocking: none`, and supply-chain checks off.

Current react-doctor (0.9.21) has no `--offline` flag. `--no-score` (alias `--no-telemetry`) skips the score API, the share URL, and crash reporting. `--no-supply-chain` skips the Socket.dev dependency check. With the score API skipped, the tool does not compute a local score. The JSON summary field `score` is `null`. The human report says `Score disabled by --no-score.`

Baseline from `yarn doctor` on this commit:

- Numeric score: unavailable. Do not treat a missing score as 0 or as 100.
- 19 diagnostics: 1 error, 18 warnings, across 11 files.

| Count | Severity | Rule |
| --- | --- | --- |
| 4 | warning | `react-doctor/no-effect-chain` |
| 4 | warning | `react-doctor/no-set-state-after-await-in-effect` |
| 3 | warning | `react-doctor/context-provider-value-from-unmemoized-local-literal` |
| 2 | warning | `react-doctor/no-loading-flag-reset-outside-finally` |
| 2 | warning | `react-doctor/rerender-lazy-state-init` |
| 1 | error | `react-doctor/effect-needs-cleanup` |
| 1 | warning | `react-doctor/no-adjust-state-on-prop-change` |
| 1 | warning | `react-doctor/no-json-parse-stringify-clone` |
| 1 | warning | `react-doctor/no-static-element-interactions` |

Do not add diagnostics. When a numeric score can be produced without sending the project to an external API, do not lower that score. The goal is 100, enforced in CI later.

## aislop

`yarn aislop` is `aislop scan` (aislop 0.20.0). `.aislop/config.yml` sets `ci.failBelow` to `0` and turns telemetry off. `failBelow: 0` disables the score threshold for `aislop ci`. Error-severity findings still make `aislop ci` and `aislop scan` exit 1. That exit code is expected at this baseline. CI does not fail on it.

Baseline from `yarn aislop` on this commit:

- Score: **61 / 100** (Needs Work). 8 errors, 18 warnings, 28 files, five engines. Exit code 1.

| Count | Severity | Rule |
| --- | --- | --- |
| 8 | error | `ai-slop/hallucinated-import` |
| 4 | warning | `ai-slop/console-leftover` |
| 4 | warning | `react/set-state-in-effect` |
| 3 | warning | `unicorn/no-new-array` |
| 1 | warning | `complexity/file-too-large` |
| 1 | warning | `complexity/function-too-long` |
| 1 | warning | `import/no-duplicates` |
| 1 | warning | `jsx-a11y/click-events-have-key-events` |
| 1 | warning | `jsx-a11y/no-static-element-interactions` |
| 1 | warning | `react/purity` |
| 1 | warning | `react/refs` |
| 1 | info | `knip/skipped` |
| 1 | info | `security/dependency-audit-skipped` |

Do not lower 61. The goal is 100, with `failBelow` raised to a hard gate in a later pull request.

## Pull requests

After opening or pushing to a pull request, wait until CI has finished and at least 10 full minutes have passed, then check for the GitHub Copilot review.

Respond to every Copilot review comment and every human review comment. Fix the point, or reply explaining why you disagree. Then resolve the thread. Leave no thread open.

A pull request's own changes must not break CI. A failure that already exists on `main` is not that pull request's job to fix. Say so in the pull request description.

Only report a pull request as ready once all of the above is done.
