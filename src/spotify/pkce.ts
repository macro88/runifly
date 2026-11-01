export const STALE_PKCE_MESSAGE =
  "Spotify sign-in expired. The old callback code was removed so you can sign in again.";

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
  return url.toString();
}

export function stalePkceRecovery(
  error: unknown,
  href: string
): { href: string; message: string } | null {
  if (!isStalePkceError(error)) return null;
  return { href: hrefWithoutSpotifyCallback(href), message: STALE_PKCE_MESSAGE };
}
