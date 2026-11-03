import {
  AuthorizationCodeWithPKCEStrategy,
  SpotifyApi,
  type UserProfile,
} from "@spotify/web-api-ts-sdk";
import { messageForSpotifyError } from "./httpStatus";
import { isStalePkceError, stalePkceRecovery } from "./pkce";
import { isSpotifyRedirectUri, resolveSpotifyRedirectUri } from "./redirect";
import { RUNIFLY_SPOTIFY_SCOPES, SPOTIFY_SCOPE_STORAGE_KEY } from "./scopes";
import { clearSdkEntries, createTokenCache } from "./tokenStore";

export interface SignedInSpotify {
  sdk: SpotifyApi;
  profile: UserProfile | null;
  error: Error | null;
}

let pending: Promise<SpotifyApi | null> | null = null;

export function abandonSpotifyConnection(): void {
  pending = null;
}

export async function loadSignedInSdk(clientId: string): Promise<SignedInSpotify | null> {
  const sdk = await connectSpotify(clientId);
  if (!sdk) return null;
  try {
    const profile = await sdk.currentUser.profile();
    return { sdk, profile, error: null };
  } catch (profileError) {
    console.error(profileError);
    const hint = messageForSpotifyError(profileError);
    return { sdk, profile: null, error: hint ? new Error(hint) : null };
  }
}

/**
 * One SDK and one PKCE exchange for the page. React StrictMode runs effects
 * twice, and Spotify's authorization code can be exchanged only once.
 */
export function connectSpotify(clientId: string): Promise<SpotifyApi | null> {
  if (!pending) {
    pending = authenticate(clientId)
      .then((sdk) => {
        if (!sdk) pending = null;
        return sdk;
      })
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

async function authenticate(
  clientId: string,
  retryStaleCallback = true
): Promise<SpotifyApi | null> {
  const configuredRedirect = import.meta.env.VITE_REDIRECT_TARGET;
  if (!isSpotifyRedirectUri(configuredRedirect)) {
    throw new Error("Redirect URI must be http://127.0.0.1:<port> or https.");
  }
  const redirectUrl = resolveSpotifyRedirectUri(
    configuredRedirect,
    import.meta.env.BASE_URL,
    window.location.href
  );
  if (!redirectUrl || !isSpotifyRedirectUri(redirectUrl)) {
    throw new Error("Redirect URI must be http://127.0.0.1:<port> or https.");
  }

  const sdk = new SpotifyApi(
    new AuthorizationCodeWithPKCEStrategy(clientId, redirectUrl, [
      ...RUNIFLY_SPOTIFY_SCOPES,
    ]),
    {
      cachingStrategy: createTokenCache(window.sessionStorage, window.localStorage),
    }
  );

  const scopeMarker = RUNIFLY_SPOTIFY_SCOPES.join(" ");
  if (window.localStorage.getItem(SPOTIFY_SCOPE_STORAGE_KEY) !== scopeMarker) {
    clearSdkEntries(window.sessionStorage);
    clearSdkEntries(window.localStorage);
    window.localStorage.setItem(SPOTIFY_SCOPE_STORAGE_KEY, scopeMarker);
  }

  try {
    const result = await sdk.authenticate();
    if (!result.authenticated) return null;
    return sdk;
  } catch (error) {
    if (!retryStaleCallback || !isStalePkceError(error)) throw error;
    const recovery = stalePkceRecovery(error, window.location.href);
    if (!recovery || recovery.href === window.location.href) {
      throw new Error(recovery?.message ?? "Spotify sign-in expired.", {
        cause: error,
      });
    }
    window.history.replaceState({}, document.title, recovery.href);
    return authenticate(clientId, false);
  }
}
