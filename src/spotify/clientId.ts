export const CLIENT_ID_STORAGE_KEY = "runifly-spotify-client-id";

/** Spotify client ids are 32 letters and digits. The secret is never accepted. */
export const SPOTIFY_CLIENT_ID_PATTERN = /^[A-Za-z0-9]{32}$/;

export const PRODUCTION_REDIRECT_URI = "https://runifly.com/";
export const SPOTIFY_DASHBOARD_URL = "https://developer.spotify.com/dashboard";
export const SPOTIFY_ACCOUNT_APPS_URL = "https://www.spotify.com/account/apps/";

export function clientIdProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a Spotify Client ID.";
  if (!SPOTIFY_CLIENT_ID_PATTERN.test(trimmed)) {
    return "A Spotify Client ID is 32 letters and digits.";
  }
  return null;
}

export function maskClientId(clientId: string): string {
  return `${clientId.slice(0, 4)}…${clientId.slice(-4)}`;
}

export function readStoredClientId(storage: Storage): string | null {
  const value = storage.getItem(CLIENT_ID_STORAGE_KEY);
  if (!value) return null;
  if (clientIdProblem(value)) {
    storage.removeItem(CLIENT_ID_STORAGE_KEY);
    return null;
  }
  return value;
}

export function writeStoredClientId(storage: Storage, clientId: string): boolean {
  if (clientIdProblem(clientId)) return false;
  storage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
  return true;
}

export function removeStoredClientId(storage: Storage): void {
  storage.removeItem(CLIENT_ID_STORAGE_KEY);
}
