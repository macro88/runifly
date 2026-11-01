/**
 * Scopes the app actually uses, requested once.
 * Playlist read/modify covers the list and reorder. user-read-private covers
 * the header profile. Image upload and email are not requested.
 */
export const RUNIFLY_SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
] as const;

export const SPOTIFY_SCOPE_STORAGE_KEY = "runifly-spotify-scopes";
