# Song timing

Each song row shows when that track starts and ends on the course: a kilometre range and a race-time range. The ranges follow the pace and the track lengths, in playlist order.

## Sub-features

- `timing-km` shows `lapFrom - lapTo` in the `KM` column. Those fields are kilometres, despite the name.
- `timing-race` shows the race-time range computed from cumulative song length.
- `timing-order` keeps playlist order, so the next song starts where the previous one ended.

## How to get to it (user POV)

- Select a playlist, load a course, and set a pace. The table under the chart updates its `KM` and `Race Time` columns.
- Reordering rows is a separate gesture (drag the handle). Verification does not reorder.

## Driving it with verify-runifly

Preconditions:

- Fixture playlist selected, `fixtures/fixture-climb.gpx` loaded, pace textbox `05:00`.
- `yarn verify` is the command that reaches this state and checks it.
- Expected cell text, hand-computed for durations 180 s, 240 s, and 90.5 s at 300 seconds per kilometre:

  - `Warm Up`: song `3:00`, km `0 - 0.6`, race `0:00 - 3:00`
  - `The Climb`: song `4:00`, km `0.6 - 1.4`, race `3:00 - 7:00`
  - `Easy Descent`: song `1:31`, km `1.4 - 1.7`, race `7:00 - 8:31`

- **Read the rows.** For each song name, the script waits until the `tr` containing that name has `td` text for the three strings above. It prints `Name | song … | km … | race …`. `getByRole("row")` and `getByRole("cell")` do not match these rows: the sortable attributes set `role="button"` on the `<tr>`.
- **Save the proof.** The script writes `evidence/song-table.png` (full page, table visible) and `evidence/song-table.txt` (cell text). Exit code 0 and `verify-runifly: PASS` are required as well.
- **Check the chart band.** After the three rows match, the script hovers each song row and reads `.hoveredSongRect`. The band's left and right edges must sit at that song's kilometres on the 4 km course: edge = plot origin + (km / 4) × plot width. The callout text contains the song name. This checks the chart scale. It does not replace the table strings above.

The same numbers are asserted without the browser in `src/data/timing.test.ts` against `updateTimingData`. `1.7` is `parseFloat((510.5 / 300).toFixed(2))`, not the unrounded `1.7016…`. `8:31` is `Math.round(30.5)` inside `formatTimeFromSeconds`, not `8:30`.

## Gotchas

- These strings are today's baseline. A pull request that changes the timing formula updates this file's list, the `songs` array in `scripts/verify.mjs`, and `src/data/timing.test.ts` together. A pull request that only fixes GPX distance, laps, or the chart does not change these strings. Song timing does not read the GPX.
- The song table is the timing oracle. The band-edge check uses the same kilometre numbers as a chart scale, not as a second timing formula. Do not assert lap totals or `createFakeGpx` in this journey. Details are in the skill section "Baseline that later fixes will move".
- Kilometre cells are the pace-sensitive proof. Race times do not change when the pace changes, so a race-time match on its own does not prove the pace was applied.
- Matching `0 - 0.6` as a substring of a longer cell is not enough for a future edit. The helper compares whole `td` strings.
- Song rows are not `role="row"`. A locator written that way times out even when the titles are on screen.
- Dragging a row calls the same timing function. This journey does not drag, so it does not prove reorder.
