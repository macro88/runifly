/**
 * Spotify accepts HTTPS redirect URIs, and HTTP only for 127.0.0.1 with a port.
 * localhost is rejected.
 */
export function isSpotifyRedirectUri(value: string | undefined): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  return (
    url.protocol === "http:" &&
    url.hostname === "127.0.0.1" &&
    url.port !== ""
  );
}
