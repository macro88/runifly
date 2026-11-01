# Set the pace

The pace control sets seconds per kilometre. Song start kilometres are race time divided by that pace. The target-time control is a second way to derive the same pace and is not the journey this skill drives.

## Sub-features

- `pace-set` accepts a minutes-and-seconds pace from the pace picker.
- `pace-shown` displays that pace as `mm:ss` with the suffix `/km`.

## How to get to it (user POV)

- After a course is loaded, open the `Pace` time picker, choose minutes and seconds, and confirm.
- Alternatively, edit `Target Time` or `Distance (km)`. Both recompute the pace. Verification does not use those paths for the timing oracle.

## Driving it with verify-runifly

Preconditions:

- `Fixture Climb` is the heading and the distance field is `4`. Load the course first. `yarn verify` does the steps in that order.
- The browser was launched with `TZ=UTC`.

- **Set 5:00 per kilometre.** The script clicks the textbox named `Pace`, clicks `05` in the minute column and `00` in the second column of the visible `.ant-picker-dropdown`, then clicks `.ant-picker-ok button`. The textbox value is `05:00`.
- **Leave the field on screen.** The timing assertion reads the song table only after this value is `05:00`.

## Gotchas

- Setting the pace before the GPX load does not stick. The distance change recomputes pace from the target time.
- The picker needs the OK button. Choosing a cell does not commit the value on its own.
- `handlePaceChange` uses the picker's minutes and seconds only. An hour column, if a future Ant Design build shows one, must not be what the assertion trusts. Trust the textbox value `05:00`.
- On a machine whose zone is not a whole number of hours, `dayjs` can render this control's underlying timestamp with the wrong `mm:ss` unless `TZ=UTC`. The helper sets that.
