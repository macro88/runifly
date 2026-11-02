# Load a course

Loading a GPX replaces the generated course with the file's name and distance. The distance field and the page heading both update.

## Sub-features

- `course-file` reads a `.gpx` file from the file input and parses it.
- `course-name` shows the track name as the level-1 heading.
- `course-distance` shows the parsed length in the distance field, in kilometres to two decimal places.

## How to get to it (user POV)

- Choose the course area. That opens the hidden file input labelled `Course GPX file`.
- Choose a `.gpx` file. The drop target on the same area accepts a `.gpx` file as well.

## Driving it with verify-runifly

Preconditions:

- The fixture playlist journey is in progress and `Warm Up` is already visible. `yarn verify` does this before loading the file.
- `fixtures/fixture-climb.gpx` is the file. It is synthetic, one track, one segment, five points, with a climb from 30 m to 180 m.

- **Load the sample.** The script calls `setInputFiles` on the input labelled `Course GPX file` with `fixtures/fixture-climb.gpx`. It does not click the course viewer.
- **Read the result.** The level-1 heading matches `Fixture Climb`. The spinbutton named `Distance (km)` has value `4`. The visible label is not the accessible name. The input's `aria-label` is.

## Gotchas

- Clicking the course viewer opens a native file dialog. `setInputFiles` is the harness equivalent of the user choosing a file. A click followed by nothing is not a successful load.
- Set the pace after this step. Changing the distance recomputes the pace from the target time already on screen.
- The value `4` is today's haversine of this file, not a promise about a future distance fix. See the skill section "Baseline that later fixes will move".
- A one-point file or a file with several track segments loads. This journey still uses the one-segment sample. Distance for the other shapes is covered by Vitest, not by changing this file's expectations.
- The chart drawn for this course is not proof that the climb or the distance is right. It is plotted per lap.
