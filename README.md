# Runifly

[![aislop](https://img.shields.io/endpoint?url=https%3A%2F%2Frunifly.com%2Fbadges%2Faislop.json)](https://github.com/macro88/runifly/actions/workflows/build_deploy.yaml)
[![react-doctor](https://img.shields.io/endpoint?url=https%3A%2F%2Frunifly.com%2Fbadges%2Freact-doctor.json)](https://github.com/macro88/runifly/actions/workflows/build_deploy.yaml)

Runifly is a client-only web app for arranging a Spotify playlist against a route. A runner or hiker loads a GPX file, sets a pace, and connects Spotify. The app times the playlist against the route, so a song can be placed where it will be playing, for example a harder track for a hill.

The interface is React and Ant Design, written in TypeScript and built with Vite. There is no backend. Sign-in uses Spotify's authorisation code flow with PKCE in the browser. Each person creates a Spotify app and pastes its Client ID into the page. The id stays in that browser. The build does not contain one. Access and refresh tokens stay in session storage unless Stay signed in is turned on, which keeps them in local storage.

Drop a `.gpx` file onto the course panel to load a route. The distance is taken from the track. The page opens on a generated 42.196 km course. Set the distance in kilometres, the pace in minutes per kilometre, or a target time; pace and target time follow each other. After you sign in, the app lists your Spotify playlists. Choosing one places each song on the route from its duration and the pace, and the elevation chart shows the profile. Drag songs into the order you want. The sync control writes that order back to the playlist. A control in the header switches between light and dark mode.

## Screenshot

There is no screenshot in the repository.

## Requirements

- Node.js 22.13 or newer on the 22 LTS line. `.nvmrc` selects 22, and `package.json` `engines.node` is `^22.13.0`. CI installs that file with `actions/setup-node`. `expo-doctor` (a dependency of `react-doctor`) rejects Node 20. Vite 8 declares `node: ^20.19.0 || >=22.12.0`.
- [Yarn Classic](https://classic.yarnpkg.com/) 1.x. `yarn.lock` is a Yarn 1 lockfile.
- A Spotify account.
- For a Spotify app in development mode: the owner of the app needs an active Spotify Premium subscription, and each person who uses the app must be on its allowlist. Development mode allows up to five users.

## Setup

### Create a Spotify app

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. New apps start in development mode. The app owner needs Spotify Premium. Under the app's settings, open user management and add each person who will sign in, including yourself. The allowlist holds up to five users. Spotify rejects API calls for an account that is not on the list.
3. Add a redirect URI. The app builds it from Vite's base and does not hard-code the path.
   - Local development: `http://127.0.0.1:5173/`. Spotify rejects `localhost`. HTTP is accepted for a loopback address. The dev server base is `/`. `VITE_REDIRECT_TARGET` may be `http://127.0.0.1:5173` or the same URI with a trailing slash. Sign-in keeps that loopback host, so it still returns to port 5173 when the address bar says `localhost`. The app does not start sign-in unless the configured value is `http://127.0.0.1:<port>` or an `https://` URL.
   - Production, at [https://runifly.com/](https://runifly.com/): the production base is `/`. On that site the callback is the page origin plus the base, `https://runifly.com/`.
4. Copy the Client ID. Leave the client secret in the Spotify dashboard. PKCE does not use it, and the app never asks for it. Paste the Client ID into the setup screen. It is stored in local storage on that browser until you remove it. There is no client id in `.env`, in the JavaScript bundle, or in the publish workflow.

### Environment

```sh
cp .env.example .env
```

| Name | Purpose |
| --- | --- |
| `VITE_REDIRECT_TARGET` | A Spotify-legal redirect: `http://127.0.0.1:5173` locally, or an `https://` URL for a production build. The path sent to Spotify is Vite's base, not a path typed into this variable. |

`.env` is listed in `.gitignore`. The committed template is `.env.example`. The Client ID is not an environment variable.

The GitHub Actions workflow that publishes `main` supplies `VITE_REDIRECT_TARGET` from a repository variable at build time. That build does not read `.env` and does not inject a Spotify client id. The variable has to be an `https://` URL. On [https://runifly.com/](https://runifly.com/) the callback is `https://runifly.com/`, from the page origin and the `/` base.

### Install and run

```sh
yarn
yarn dev --host 127.0.0.1 --port 5173 --strictPort
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The setup screen asks for the Client ID. Try with sample data opens the page with `?fixtures=1` and does not contact Spotify.

`yarn dev` with no extra flags starts Vite on port 5173 and prints `http://localhost:5173/`. That process listens on localhost. Spotify rejects `localhost` as a redirect URI, and a connection to `http://127.0.0.1:5173` is refused while the server is bound that way. `--host 127.0.0.1` makes Vite serve `http://127.0.0.1:5173/`. The dev base is `/`, so the redirect URI is `http://127.0.0.1:5173/` when `VITE_REDIRECT_TARGET` names that loopback origin. `--strictPort` makes Vite exit when 5173 is already taken, so the redirect URI stays on that port.

## Deploy

A push to `main`, or a manual run of [`.github/workflows/build_deploy.yaml`](.github/workflows/build_deploy.yaml), publishes the production build to GitHub Pages at [https://runifly.com/](https://runifly.com/). Pull requests run `yarn lint`, `yarn test`, `tsc`, and the Quality scores job, and do not deploy. Quality scores fails if `yarn doctor` reports a finding, or if `yarn aislop` scores below 96 or reports an error.

That publish also writes `badges/aislop.json` and `badges/react-doctor.json` into the site. The shields at the top request those files, so the numbers are the scores from the latest publish of `main`. Green is 90 and up, yellow is 70 to 89, and red is below 70. The react-doctor badge shows error and warning counts when the score API does not return a number.

The publish job installs with `yarn install --frozen-lockfile`, then runs `yarn build`. The production Vite base is `/`, so scripts, the favicon, and the Spotify callback sit at the domain root. There is no client-side router. Spotify returns to `https://runifly.com/` with query parameters, and GitHub Pages serves `index.html` for `/`. The build does not add a `404.html` copy. The custom domain is the repository Pages setting. Publishing with GitHub Actions does not read a `CNAME` file, so this repository does not add one.

After a successful Pages deployment the job bumps a version tag and creates a GitHub release. The tag step is `anothrNick/github-tag-action`. The release step is `gh release create` on the runner.

Two settings live outside this repository. Do both before the first production sign-in:

1. On GitHub, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Set **Custom domain** to `runifly.com`.
2. In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add this Redirect URI exactly: `https://runifly.com/`

## Known issues

`@spotify/web-api-ts-sdk` 1.2.0 still calls the removed `/playlists/{id}/tracks` routes. This app loads and reorders with `GET` and `PUT /playlists/{id}/items`, using the access token from that SDK. Spotify development mode only returns playlist songs when the signed-in user owns the playlist or collaborates on it. Any other playlist shows a message instead of an empty track list. The song count on your playlist list is `items.total` from `GET /me/playlists`.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for what's planned.

In progress: verification tests, a Spotify client fix, dependency upgrades, timing and distance fixes, and UI work.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). One change per pull request. Run `yarn lint`, `yarn test`, and `yarn build` before opening it, plus `yarn doctor` and `yarn aislop` (no doctor findings; aislop at least 96, with no errors).

## Licence

Released under the [MIT Licence](LICENSE). Copyright 2024-2026 macro88.
