# Playlist coverage

Once a playlist is on the course, the strip above the chart warns when the songs are shorter than the run, and asks for shuffle and crossfade before calling the run ready.

## Sub-features

- `coverage-short` shows the minute shortfall when the songs do not cover the run.
- `coverage-covered` drops that warning when the songs do cover the run.
- `checklist-shuffle` is a tick the user sets. It is not read from Spotify and is not kept after a reload.
- `checklist-crossfade` is a 0–12 second field. An empty field stays incomplete. The number is kept in localStorage.
- `coverage-refresh` changes the shortfall sentence when the pace changes.

## How to get to it (user POV)

- Select a playlist, load a course, and set a pace. The strip sits above the elevation chart.
- The fixture songs last 510.5 seconds. On the 4 km sample at 5:00 per kilometre the run is 20:00, so the playlist is about 11 minutes short.
- At 2:00 per kilometre the same course is 8:00, which those songs cover.

## Driving it with verify-runifly

Preconditions:

- The song-timing checks have already passed at pace `05:00` on `Fixture Climb`.
- `yarn verify` continues straight into this part. Do not start a second preview.

- **Read the shortfall.** The strip says the playlist is about 11 minutes short. The helper writes `evidence/shortfall.png`.
- **Cover the run.** The helper sets the pace to `02:00`. The 11-minute sentence is gone. The strip says timing only holds if shuffle is off and crossfade matches, and it asks for the crossfade. The helper writes `evidence/checklist-incomplete.png`.
- **Finish the checklist.** Tick `Shuffle is off in Spotify` and type `12` in `Crossfade in Spotify (seconds)`. The field stays after the first digit. Leaving the field stores the number and the strip reads `Ready for the run`. The helper writes `evidence/ready.png`.
- **Reload.** The helper opens `/?fixtures=1` again and chooses `Fixture Songs`. The crossfade field is `12`. The shuffle box is clear.
- **Change the pace.** The helper loads the sample GPX again and sets the pace to `05:00`. The shortfall sentence is still present and its minute count has changed.

## Gotchas

- Crossfade does not move the song rows. The kilometre and race-time checks stay the ones taken at `05:00`, before this part changes the pace.
- A typed crossfade is stored when the field is left, not on the first digit. `12` is a stored crossfade. An empty field is not. After a reload the field must show `12`, not a blank box.
- At `02:00` per kilometre the fixture songs still cover the run with a 12 second crossfade (486.5 seconds of music against an 8:00 run).
- The strip is absent until the playlist has tracks. Wait for the crossfade field after choosing the playlist.
- Song rows are not `role="row"`. The playlist list row `Fixture Songs` is.
