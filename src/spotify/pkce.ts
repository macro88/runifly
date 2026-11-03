export const STALE_PKCE_MESSAGE =
  "Spotify sign-in expired. The old callback code was removed so you can sign in again.";

export const OAUTH_ERROR_MESSAGE =
  "Spotify did not sign you in. Check the Client ID and that the Redirect URI matches exactly. You can change the key and try again.";

export const REDIRECT_KEY_WARNING =
  "If Spotify rejects the sign-in, the Client ID is wrong or the Redirect URI does not match exactly.";

export function isStalePkceError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("No verifier found in cache")
  );
}

/** Drop the OAuth callback params so the next sign-in does not reuse a dead code. */
export function hrefWithoutSpotifyCallback(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  return url.toString();
}

export function oauthCallbackMessage(href: string): string | null {
  try {
    if (!new URL(href).searchParams.has("error")) return null;
  } catch {
    return null;
  }
  return OAUTH_ERROR_MESSAGE;
}

export function stalePkceRecovery(
  error: unknown,
  href: string
): { href: string; message: string } | null {
  if (!isStalePkceError(error)) return null;
  return { href: hrefWithoutSpotifyCallback(href), message: STALE_PKCE_MESSAGE };
}
