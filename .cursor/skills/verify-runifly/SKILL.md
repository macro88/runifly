---
name: verify-runifly
description: "Drive the Runifly web app the way a user does and prove song timing, with no Spotify credentials and no network calls. Use after changes to the course UI, pace or GPX timing, the Spotify client, fixtures, or dependencies (React, Ant Design, Vite, TypeScript), and before claiming a Runifly change works."
---

# Verify Runifly

Runifly is a client-only React app. A user loads a GPX, sets a pace, picks a playlist, and reads each song's start kilometre and race time in the table. This skill does that against a committed sample course and a fixed playlist, in a headless browser, then runs the unit tests, lint, and production build.

Run it from the repository root:

```bash
yarn playwright install chromium   # once per machine
yarn verify
```

`yarn verify` is `node .cursor/skills/verify-runifly/scripts/verify.mjs`.

## Pass and fail

Pass is exit code 0 and a final line `verify-runifly: PASS`. The browser section prints one line per fixture song, then the evidence path. For pace `05:00` (300 seconds per kilometre) the lines are:

```text
Warm Up | song 3:00 | km 0 - 0.6 | race 0:00 - 3:00
The Climb | song 4:00 | km 0.6 - 1.4 | race 3:00 - 7:00
Easy Descent | song 1:31 | km 1.4 - 1.7 | race 7:00 - 8:31
```

Fail is a non-zero exit code and a final line `verify-runifly: FAIL`, with the failing step named above it. Do not treat a screenshot alone as a pass. Cleanup never deletes the evidence files.

## Launch

The helper builds, then starts Vite preview itself. Do not start a second server for the same run.

1. `yarn test` (Vitest, `src/**/*.test.ts`).
2. `yarn lint` (`eslint . --max-warnings 0`).
3. `yarn build` (`tsc && vite build`). The helper sets `VITE_SPOTIFY_CLIENT_ID=verify-not-a-secret` and `VITE_REDIRECT_TARGET` to the preview origin. Those values are dummies. They are not Spotify credentials. The helper overrides any `VITE_SPOTIFY_*` values already in the environment so a real client id is not baked into `dist/`.
4. `yarn preview --host 127.0.0.1 --port $VERIFY_PORT --strictPort`. `VERIFY_PORT` defaults to `4173`. If that port is already taken, the helper stops and tells you to pick another. It does not kill the existing process.
5. Ready means `GET http://127.0.0.1:$VERIFY_PORT/?fixtures=1` returns HTTP 200 and the body contains `id="root"`. The production build's Vite base is `/`, and `vite preview` serves that build at the root. Preview logs go to `.cursor/skills/verify-runifly/evidence/preview.log`.

Open the app only at `/?fixtures=1`. Without that query the shared Spotify auth effect starts PKCE and the browser is sent to `accounts.spotify.com`. The helper aborts any request whose host is not `127.0.0.1` or `localhost` and fails the run if one was attempted.

Two verifications need two ports. Set `VERIFY_PORT` on the second. Never drive a preview this run did not start.

## Doctor

The helper runs this after launch, before it touches the page. Run the same checks yourself when a later step looks wrong.

- Preview process is still alive. `/proc/net/tcp` has a LISTEN socket on `127.0.0.1:<port>`, and a pid in the preview process tree holds that socket inode under `/proc/<pid>/fd`. The helper does not use `ss` or `lsof`.
- `GET /?fixtures=1` is HTTP 200 and contains `id="root"`.
- After the browser opens, the header reads `Runifly` and `Fixtures`, and the URL is still `http://127.0.0.1:<port>/?fixtures=1`.

A doctor failure means do not drive. Read `evidence/preview.log`, stop the preview this run started, and launch again.

## Drive

The helper drives one journey that covers the feature map. Selectors below are what it uses.

1. Open `http://127.0.0.1:<port>/?fixtures=1` with Chromium headless, viewport 1440×900, `TZ=UTC`. UTC matters: the pace control stores a dayjs value from epoch milliseconds, and `mm:ss` is rendered in the browser's local zone.
2. Click the row whose text contains `Fixture Songs` (3 songs, description `Offline timing fixture`). The song table gains `Warm Up`, `The Climb`, and `Easy Descent`. Those song rows are `<tr>` elements with `role="button"` because the drag-and-drop attributes are spread onto the row. Do not look them up with `getByRole("row")`. Use the `tr` that contains the song name, and read `td` text rather than `role="cell"`.
3. `setInputFiles` on the file input labelled `Course GPX file` (`fixtures/fixture-climb.gpx`). Do not click the course viewer. That click opens a native file dialog the harness cannot complete. Drag-and-drop is a second entry point and is not the one this journey uses.
4. The level-1 heading becomes `Fixture Climb`. The spinbutton named `Distance (km)` reads `4`. The visible label is not wired to the input by itself. The input carries `aria-label="Distance (km)"`.
5. Set the pace after the GPX load, not before. Loading a course changes the distance, and the pace effect recomputes pace from the existing target time. Click the textbox named `Pace`, choose minute `05` and second `00` in the open `.ant-picker-dropdown`, then press the `.ant-picker-ok` button. The field reads `05:00`.
6. Read the song table. Each body row's cells must contain the song time, the `KM` text, and the race-time text listed under Pass and fail. Match the cell text, not a screenshot.

The pure function behind that table is `updateTimingData` in `src/data/timing.ts`. Vitest locks the same numbers in `src/data/timing.test.ts`. The browser check locks the strings `formatTimeFromSeconds` actually paints, including `Math.round` on the leftover seconds (`90.5` and `510.5` display as `:31`).

## Evidence

Written under `.cursor/skills/verify-runifly/evidence/` (gitignored):

- `song-table.png` is a full-page screenshot taken after the pace is set, the three rows match, and the pace panel has been dismissed so it does not cover the table.
- `song-table.txt` records the URL, course name, distance, pace, external request count, and each row's cell text.
- `preview.log` is the Vite preview output.
- `failure.png` is written only when the browser journey throws.

A proof is the exit code, the printed song lines, `externalRequests: 0`, a URL still on `127.0.0.1` with `fixtures=1`, and `song-table.png`. The screenshot must show the timed rows. Keep the action (the printed journey) with the resulting state (the file). Do not treat the elevation chart as proof of distance or timing.

## Cleanup

The helper sends `SIGTERM` to the preview process group, then `SIGKILL` if it is still alive. It does not kill by process name. It then checks `/proc/net/tcp` again and fails if that preview still holds the listen socket. Evidence files are left in place. Confirm `song-table.png` is still on disk after the preview pid is gone. The helper prints that confirmation before `PASS`.

`dist/` is the verify build and contains the dummy client id. Do not deploy it. It is gitignored.

## Helpers

```bash
yarn verify
VERIFY_PORT=4174 yarn verify
node .cursor/skills/verify-runifly/scripts/verify.mjs
```

The script is the harness. It is executable. There is no separate control binary. Extend the script when a journey needs a new assertion, and update the feature file in the same change. Do not add a test-only HTTP endpoint or a way to set pace from the query string. The pace and the GPX must go through the controls a user uses.

## Baseline that later fixes will move

Encode today's behaviour. Do not "correct" these oracles in a verification-only change.

Song kilometres and race times (the Vitest expectations and the six strings in the browser output) follow today's `updateTimingData`: cumulative raw duration, `toFixed(2)` on each boundary, kilometres = that rounded boundary / pace. They do not depend on GPX geometry. A timing-fix pull request that changes rounding, the running total, or the meaning of pace must update `src/data/timing.test.ts` and the `songs` table in `scripts/verify.mjs` together. Until that formula changes, those assertions stay.

The sample journey does not assert the course geometry below. Vitest covers it.

- Displayed course distance (`4`) is the haversine in `src/utils/gpxUtils.tsx` (`earthRadiusMeters = 6371008.8`) of `fixtures/fixture-climb.gpx`, rounded to the nearest millimetre and shown to two decimal kilometres. It does not use `aggregateLaps`.
- The elevation chart is plotted per lap, not per metre. Do not assert path positions, axis ticks, or the shape of the climb. The sample climbs from 30 m to 180 m between kilometres 2 and 3 in the file. The chart is not the oracle for that climb.
- `aggregateLaps` closes a lap at each 1000 m and the last lap is the remainder. Lap distances sum to the route length. The sample's points sit on whole kilometres, so it is four laps of 1000 m. This journey does not read lap totals.
- `createFakeGpx` stores a fractional kilometre as metres on an extra point. The journey replaces that generated course by loading the sample. Do not assert the fake course.
- A GPX with several segments or tracks, a route, or one point loads. Distance is the haversine along each continuous segment or route. The straight line across a break between segments or tracks is not added. A missing elevation is carried forward, or 0 when nothing earlier has one. This journey still loads the one-segment sample. Vitest covers the other shapes. Do not weaken this journey.

## Scores

[AGENTS.md](../../../AGENTS.md) at the repository root requires `yarn verify` on every change, and forbids lowering the react-doctor or aislop score. This skill is the verify half. Also run `yarn doctor` and `yarn aislop`. Those two commands report scores and do not gate this pass line.

## Maintenance

When the app changes, run `/maintain-verification-skill` so the feature map stays honest. That pass edits only this skill directory. A product regression is reported, not written out of the map.
