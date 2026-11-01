# Runifly

Runifly is a client-only web app for arranging a Spotify playlist against a route. A runner or hiker loads a GPX file, sets a pace, and connects Spotify. The app times the playlist against the route, so a song can be placed where it will be playing, for example a harder track for a hill.

The interface is React and Ant Design, written in TypeScript and built with Vite. There is no backend. Sign-in uses Spotify's authorisation code flow with PKCE in the browser.

Drop a `.gpx` file onto the course panel to load a route. The distance is taken from the track. The page opens on a generated 42.196 km course. Set the distance in kilometres, the pace in minutes per kilometre, or a target time; pace and target time follow each other. After you sign in, the app lists your Spotify playlists. Choosing one places each song on the route from its duration and the pace, and the elevation chart shows the profile. Drag songs into the order you want. The sync control writes that order back to the playlist. A control in the header switches between light and dark mode.

## Screenshot

There is no screenshot in the repository.

## Requirements

- Node.js 18, or Node.js 20 or newer. The installed Vite 5 release declares `node: ^18.0.0 || >=20.0.0`.
- [Yarn Classic](https://classic.yarnpkg.com/) 1.x. `yarn.lock` is a Yarn 1 lockfile.
- A Spotify account.
- For a Spotify app in development mode: the owner of the app needs an active Spotify Premium subscription, and each person who uses the app must be on its allowlist. Development mode allows up to five users.

## Setup

### Create a Spotify app

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. New apps start in development mode. The app owner needs Spotify Premium. Under the app's settings, open user management and add each person who will sign in, including yourself. The allowlist holds up to five users. Spotify rejects API calls for an account that is not on the list.
3. Add a redirect URI. It has to be the same string as `VITE_REDIRECT_TARGET`.
   - Local development: `http://127.0.0.1:5173`. Spotify rejects `localhost`. HTTP is accepted for a loopback address. The app does not start sign-in unless the redirect is `http://127.0.0.1:<port>` or an `https://` URL.
   - Production: an `https://` URL for the deployed site. Register that URL as well if you use the app anywhere other than your own machine, and set `VITE_REDIRECT_TARGET` to the same value.
4. Copy the Client ID into `.env`, as below. Leave the client secret out of the repository. PKCE does not use it, and any `VITE_` variable is compiled into the JavaScript the browser downloads.

### Environment

```sh
cp .env.example .env
```

| Name | Purpose |
| --- | --- |
| `VITE_SPOTIFY_CLIENT_ID` | Client ID from the Spotify dashboard. |
| `VITE_REDIRECT_TARGET` | Redirect URI registered on the Spotify app. For local development, `http://127.0.0.1:5173`. |

`.env` is listed in `.gitignore`. The committed template is `.env.example`.

The GitHub Actions workflow that publishes `main` supplies `VITE_SPOTIFY_CLIENT_ID` from a repository secret and `VITE_REDIRECT_TARGET` from a repository variable at build time. That build does not read `.env`. The variable needs to be the HTTPS URL registered with Spotify.

### Install and run

```sh
yarn
yarn dev --host 127.0.0.1 --port 5173 --strictPort
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

`yarn dev` with no extra flags starts Vite 5.0.12 on port 5173 and prints `http://localhost:5173/`. That process listens on localhost. Spotify rejects `localhost` as a redirect URI, and a connection to `http://127.0.0.1:5173` is refused while the server is bound that way. `--host 127.0.0.1` makes Vite serve `http://127.0.0.1:5173/`, which matches `VITE_REDIRECT_TARGET`. `--strictPort` makes Vite exit when 5173 is already taken, so the redirect URI stays on that port.

## Known issues

`@spotify/web-api-ts-sdk` 1.2.0 still calls the removed `/playlists/{id}/tracks` routes. This app loads and reorders with `GET` and `PUT /playlists/{id}/items`, using the access token from that SDK. Spotify development mode only returns playlist songs when the signed-in user owns the playlist or collaborates on it. Any other playlist shows a message instead of an empty track list. The song count on your playlist list is `items.total` from `GET /me/playlists`.

## Roadmap

- Strava integration: choose a saved route or a previous activity's track as the course input.
- Water stop indicators on the map/elevation chart.
- Gel reminders on the map, e.g. every 5 km or every 30 minutes.

In progress: verification tests, a Spotify client fix, dependency upgrades, timing and distance fixes, and UI work.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). One change per pull request. Run `yarn lint` and `yarn build` before opening it.

## Licence

Released under the [MIT Licence](LICENSE). Copyright 2024-2026 macro88.
