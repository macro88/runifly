# Select a playlist

Selecting a playlist fills the song table with that playlist's tracks. In verification the only playlist is the offline fixture, so the page never redirects to Spotify.

## Sub-features

- `playlist-list` shows the fixture playlist when the URL has `fixtures=1`.
- `playlist-open` loads that playlist's three tracks into the song table.
- `playlist-offline` keeps the browser on the preview origin and sends no request to Spotify.

## How to get to it (user POV)

- Open the app at `/?fixtures=1`. The header shows `Fixtures` instead of a Spotify display name.
- Choose the row `Fixture Songs` (description `Offline timing fixture`, 3 songs).

The Spotify playlist list, which calls `currentUser.playlists`, is not a verification entry point. It requires a signed-in user and leaves the origin.

## Driving it with verify-runifly

Preconditions:

- `yarn verify` is the command. It launches preview itself.
- Doctor has reported HTTP 200 for `/?fixtures=1` and a listener pid inside the preview process tree.
- No other verification is bound to the same `VERIFY_PORT`.

- **Open the fixture app.** The script goes to `http://127.0.0.1:$VERIFY_PORT/?fixtures=1`. The header text `Runifly` and `Fixtures` are visible, and the URL still contains `fixtures=1`.
- **Choose the playlist.** The script clicks the row whose text contains `Fixture Songs`. A `tr` containing `Warm Up` appears. Song rows expose `role="button"`, so `getByRole("row")` does not find them.
- **Prove it stayed offline.** The script records every request whose host is not `127.0.0.1` or `localhost`, aborts it, and fails if the list is not empty. The printed line is `externalRequests: 0`.

## Gotchas

- Opening `/` without `fixtures=1` starts PKCE. The browser is sent to `accounts.spotify.com`. Do not follow it, and do not add credentials to make it succeed.
- The dummy client id `verify-not-a-secret` is baked into the verify build on purpose. A missing fixtures guard redirects even with that dummy. The journey must still stay on the origin.
- Do not click `Sync`. Fixtures have no Spotify snapshot to write back to.
- The header label `Fixtures` is the sign that the offline branch rendered. A blank avatar with no `Fixtures` text means the guard did not run.
