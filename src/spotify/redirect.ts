/**
 * Spotify accepts HTTPS redirect URIs, and HTTP only for 127.0.0.1 with a port.
 * localhost is rejected.
 *
 * The path comes from Vite's base (`import.meta.env.BASE_URL`), which is `/`
 * in local development and in the production build. Local sign-in keeps the
 * loopback origin from `VITE_REDIRECT_TARGET`, so an address bar of localhost
 * still returns to 127.0.0.1. On any other host the origin is the page that
 * is open, and the path is that base. On https://runifly.com/ the callback is
 * https://runifly.com/.
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

function normalizeViteBase(baseUrl: string): string {
  if (baseUrl === "" || baseUrl === "." || baseUrl === "./") return "/";
  const withLeading = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export function resolveSpotifyRedirectUri(
  configured: string | undefined,
  baseUrl: string,
  pageHref: string,
): string | undefined {
  if (!configured) return undefined;
  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configured);
  } catch {
    return undefined;
  }

  const base = normalizeViteBase(baseUrl);
  let page: URL | undefined;
  try {
    page = new URL(pageHref);
  } catch {
    page = undefined;
  }

  const onLoopbackPage =
    page?.hostname === "127.0.0.1" || page?.hostname === "localhost";
  if (onLoopbackPage && configuredUrl.hostname === "127.0.0.1") {
    return new URL(base, configuredUrl.origin).href;
  }
  if (page) return new URL(base, page.origin).href;
  return new URL(base, configuredUrl.origin).href;
}
