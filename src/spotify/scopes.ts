/**
 * Scopes the signed-in calls actually use.
 * playlist-read-private and playlist-read-collaborative: the playlist list and items.
 * playlist-modify-public and playlist-modify-private: reorder.
 * user-read-private: the header profile (name and image).
 * Email, library, playback, and image upload are not requested.
 */
export const RUNIFLY_SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
] as const;

export const SPOTIFY_SCOPE_STORAGE_KEY = "runifly-spotify-scopes";
