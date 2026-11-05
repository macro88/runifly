# Hill timing

Adjust for hills walks the course and adds time on the climbs, so a song that flat pace puts on a hill is drawn at a shorter kilometre. The pace and the target time stay as entered.

## Sub-features

- `hill-default` starts Adjust for hills on when Fixture Climb loads, because that file has a real gain, and off when no choice has been stored for a flat course.
- `hill-boundary` moves the end of The Climb at `03:00` per kilometre from `2.33` back to `2.06`, and the chart band ends further left.
- `hill-flat` puts that boundary back on `2.33` when the climb cost is 0.
- `hill-persist` keeps the toggle and the climb cost after a reload.
- `hill-coverage` uses the adjusted total for the shortfall sentence.
- `hill-none` replaces the controls when the file has no elevation data.

## How to get to it (user POV)

- Load a GPX that contains elevation. The Hills controls sit under the pace.
- Turn Adjust for hills on and edit Climb cost (seconds per metre). The song table and the hovered chart band follow the new kilometres.
- A file with no elevation data replaces the controls with one sentence.

## Driving it with verify-runifly

Preconditions:

- The song-timing and playlist-coverage checks have already passed. Those checks turn Adjust for hills off after Fixture Climb loads, then leave it off. Crossfade is stored as 12.
- `yarn verify` continues straight into this part. Do not start a second preview.

- **Read the flat boundary.** The helper sets the pace to `03:00`. Warm Up is `0 - 1`, The Climb is `1 - 2.33`, and Easy Descent is `2.33 - 2.84`. It hovers The Climb and writes `evidence/hill-markers-flat.png`.
- **Turn hills on.** The hint under the toggle and the climb-cost hint are visible, and the cost is 6. The helper writes `evidence/hill-controls.png`. The Climb becomes `1 - 2.06` and Easy Descent becomes `2.06 - 2.14`. Warm Up stays `0 - 1`. The chart band's right edge is further left. The helper writes `evidence/hill-markers-adjusted.png`.
- **Set the cost to 0.** The Climb returns to `1 - 2.33` and Easy Descent to `2.33 - 2.84`.
- **Reload.** The helper sets the cost to 8, opens `/?fixtures=1` again, and reads the toggle still on and the cost still 8.
- **Read the adjusted shortfall.** The helper opens Fixture Songs, loads Fixture Climb, sets the cost to 6 and the pace to `05:00`. The strip says the playlist is about 27 minutes short. That is 486.5 seconds of music, after a 12 second crossfade on two gaps, against 2100 seconds (4 km at 5:00 plus 150 m at 6 seconds per metre).
- **Load a course with no elevation.** The helper sets `fixtures/fixture-flat.gpx`. The heading is Fixture Flat. The sentence is "This route has no elevation data, so timing stays flat." The toggle and the climb cost are gone. The helper writes `evidence/hill-no-elevation.png`.

## Gotchas

- At `05:00` the fixture songs finish before the climb, so their kilometres do not move. The boundary check has to use `03:00`, where The Climb ends on the hill between 2 km and 3 km.
- The adjusted kilometre is shorter. The climb adds time, so the same minutes cover less ground and the marker stays on the hill instead of running ahead of the runner.
- Climb cost 0 and the toggle off both use the flat division. The unit tests lock that equality, including a zero-cost curve passed into `updateTimingData`.
- The target time on the form stays pace times distance. Coverage uses the longer total only while the adjustment is on and the cost is above 0.
- The starter course is not the no-elevation case. It has heights and no recorded gain, so the toggle stays available and defaults off until a choice is stored.
- Song rows are not `role="row"`. The band is the hovered rectangle on `.course-viewer svg`, the same one the song-timing check reads.
