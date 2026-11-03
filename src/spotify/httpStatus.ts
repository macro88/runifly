export const SPOTIFY_USER_MANAGEMENT_MESSAGE =
  "Spotify returned 403. Add your Spotify email under User Management for this app, then try again.";

export const SPOTIFY_RATE_LIMIT_MESSAGE =
  "Spotify is rate-limiting the app. Try again shortly.";

const USER_MANAGEMENT_PATTERN =
  /not registered|not approved|developer dashboard|developer\.spotify\.com|user management/i;

export function isUserManagementDenial(text: string): boolean {
  return USER_MANAGEMENT_PATTERN.test(text);
}

/** Message for a Spotify HTTP status, when this app has a specific one. */
export function spotifyStatusMessage(status: number, body = ""): string | null {
  if (status === 429) return SPOTIFY_RATE_LIMIT_MESSAGE;
  if (status === 403 && (isUserManagementDenial(body) || /bad oauth request/i.test(body))) {
    return SPOTIFY_USER_MANAGEMENT_MESSAGE;
  }
  return null;
}

export function messageForSpotifyError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { status?: unknown; message?: unknown };
  const status = typeof record.status === "number" ? record.status : undefined;
  const message = typeof record.message === "string" ? record.message : "";
  if (status === 429 || /rate limit/i.test(message)) return SPOTIFY_RATE_LIMIT_MESSAGE;
  if (status === 403 && isUserManagementDenial(message)) return SPOTIFY_USER_MANAGEMENT_MESSAGE;
  if (/bad oauth request/i.test(message) || isUserManagementDenial(message)) {
    return SPOTIFY_USER_MANAGEMENT_MESSAGE;
  }
  return null;
}
