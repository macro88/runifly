# Contributing

## Run the app

Requirements and Spotify setup are in the [README](README.md). In short:

1. Copy `.env.example` to `.env` and set `VITE_SPOTIFY_CLIENT_ID` and `VITE_REDIRECT_TARGET`.
2. Install dependencies with Yarn Classic (the repository has a Yarn 1 `yarn.lock`):

   ```sh
   yarn
   ```

3. Start Vite on the loopback address Spotify will redirect to:

   ```sh
   yarn dev --host 127.0.0.1 --port 5173 --strictPort
   ```

4. Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Pull requests

One change per pull request.

Before you open a pull request, run:

```sh
yarn lint
yarn build
```

`yarn lint` is ESLint with zero warnings. `yarn build` type-checks with `tsc` and then runs the Vite production build. Both need to succeed.
