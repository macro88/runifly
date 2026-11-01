/**
 * Offline playlist used when the page is opened with ?fixtures=1.
 * Durations are the contract the timing checks hand-compute against.
 */
export const FIXTURE_PLAYLIST_KEY = "fixture-playlist";
export const FIXTURE_PLAYLIST_NAME = "Fixture Songs";
export const FIXTURE_PLAYLIST_DESCRIPTION = "Offline timing fixture";

export const FIXTURE_TRACKS = [
  {
    id: "fixture-warm-up",
    name: "Warm Up",
    artistName: "Fixture Artist",
    albumName: "Fixture Album",
    duration_ms: 180_000,
  },
  {
    id: "fixture-climb",
    name: "The Climb",
    artistName: "Fixture Artist",
    albumName: "Fixture Album",
    duration_ms: 240_000,
  },
  {
    id: "fixture-descent",
    name: "Easy Descent",
    artistName: "Fixture Artist",
    albumName: "Fixture Album",
    duration_ms: 90_500,
  },
] as const;

export function isFixturesMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("fixtures") === "1";
}

export function fixtureSongRows() {
  return FIXTURE_TRACKS.map((track, index) => ({
    key: track.id,
    originalIndex: index,
    name: track.name,
    artistName: track.artistName,
    albumName: track.albumName,
    albumArt: "",
    songDuration: track.duration_ms / 1000,
    raceTimeFrom: 0,
    raceTimeTo: 0,
    lapFrom: 0,
    lapTo: 0,
  }));
}
