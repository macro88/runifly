# Runifly verification map

This directory is the maintained source for verifying Runifly's user-facing behaviour. Read the index, then use the matching feature file.

## Baseline preconditions

- From the repository root, run `yarn verify`.
- The helper installs nothing. Chromium must already be installed (`yarn playwright install chromium`).
- The page under test is `http://127.0.0.1:4173/?fixtures=1` unless `VERIFY_PORT` is set. Preview serves the production build, whose Vite base is `/`.
- The sample course is `fixtures/fixture-climb.gpx`. The playlist is the in-page fixture `Fixture Songs`. No Spotify account is used.
- `yarn verify` refuses a port it did not bind. A second run sets `VERIFY_PORT` to a free port.
- Never drive a preview this run did not start, and never open the app without `?fixtures=1`.

## Driving conventions

- The harness is `node .cursor/skills/verify-runifly/scripts/verify.mjs`, invoked as `yarn verify`.
- One command runs the whole journey: select the fixture playlist, load the sample GPX, set the pace to `05:00`, and read the song table.
- Prefer the accessible names in the feature files (`Pace`, `Distance`, `Course GPX file`, row text) over coordinates.
- Treat the expected cell text as literal. Kilometres drop trailing zeros (`0.6`, not `0.60`). Race times are not zero-padded hours.
- Restore nothing in the app. The preview is disposable. Do not delete proof files during cleanup.

## Proof and skip reporting

- Capture the printed journey and `evidence/song-table.png`, not only the final line.
- UI proof is the row cell text plus the screenshot. The screenshot must show the timed song table.
- `externalRequests: 0` and a URL that still has `fixtures=1` are part of the proof. They show the run never left the origin.
- Record `song-timing` as the feature id for the evidence files. The same journey also covers `select-playlist`, `load-course`, and `set-pace`. Say which of those the evidence is being used for.
- Report an unreachable path with the command that was run and the unmet precondition. Do not mark a skipped entry point as verified by a different path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph of user-visible behaviour, then exactly four H2 sections: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-runifly`, and `Gotchas`.

## Features

- [Select a playlist](./select-playlist.md) covers the fixture playlist and the rule that verification must not reach Spotify.
- [Load a course](./load-course.md) covers choosing a GPX through the file input.
- [Set the pace](./set-pace.md) covers the pace control after a course is loaded.
- [Song timing](./song-timing.md) covers the kilometre and race-time columns for the fixture tracks at 5:00 per kilometre.
