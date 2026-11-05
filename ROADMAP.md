# Roadmap

Ranked. Each line covers the user problem, the bet, and a rough size (S/M/L).

## Now

1. **Warn when the playlist won't cover the run.** Music stops early with no warning, and shuffle or crossfade throw the timing off. Bet: a length warning and a pre-run checklist (shuffle off, crossfade entered) protect every other timing feature. S, building.

## Next

2. **Slower pace on climbs.** A flat pace means every song after the first big climb arrives early, which is worst for hikers. Bet: adjusting expected pace by gradient keeps later songs on target. M, approved after the coverage warning ships.

## Later

3. **Pin a song to a climb.** Dragging songs until one roughly lines up is fiddly. Bet: marking climbs on the chart and letting you drop a song onto one is the feature people will actually show their mates. M. (Spotify no longer gives new apps tempo or energy data, so users star their own power songs.)
4. **Gel and water markers on the chart.** Handy for marathon fuelling, but it isn't the playlist problem. Bet: plain distance or time markers, no audio cues. S.
5. **Strava route import.** Strava already exports GPX, and its API approval is slow and caps users. Bet: only worth it once people ask for it. M.

## Done

- Bring-your-own Spotify Client ID (browser PKCE; no built-in key).
- Elevation chart plotted by kilometre.
- GPX distance and lap fixes on real-world files.
- Song loading via `GET`/`PUT /playlists/{id}/items` (old `/tracks` routes removed by Spotify).
- Production deploy on GitHub Pages at https://runifly.com/.
