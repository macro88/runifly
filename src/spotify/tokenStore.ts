import { GenericCache, type ICacheStore } from "@spotify/web-api-ts-sdk";

/** Prefix the Spotify SDK uses for its token and PKCE verifier entries. */
export const SDK_KEY_PREFIX = "spotify-sdk:";

export const ACCESS_TOKEN_STORAGE_KEY =
  "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token";

export const STAY_SIGNED_IN_KEY = "runifly-spotify-stay-signed-in";

export const STAY_SIGNED_IN_NOTE =
  "Leave this off to forget Spotify when the tab closes. Turn it on to keep the session in this browser.";

let staySignedIn = false;

export function staySignedInPreference(): boolean {
  return staySignedIn;
}

/**
 * Read the preference. When it is off, drop SDK entries left in localStorage
 * by the previous build, which kept tokens there indefinitely.
 */
export function loadStaySignedIn(localStore: Storage): boolean {
  staySignedIn = localStore.getItem(STAY_SIGNED_IN_KEY) === "1";
  if (!staySignedIn) clearSdkEntries(localStore);
  return staySignedIn;
}

export function setStaySignedInPreference(
  localStore: Storage,
  value: boolean,
  sessionStore: Storage
): void {
  if (value !== staySignedIn) {
    if (value) moveSdkEntries(sessionStore, localStore);
    else moveSdkEntries(localStore, sessionStore);
    staySignedIn = value;
  }
  if (value) localStore.setItem(STAY_SIGNED_IN_KEY, "1");
  else localStore.removeItem(STAY_SIGNED_IN_KEY);
}

export function sdkKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(SDK_KEY_PREFIX)) keys.push(key);
  }
  return keys;
}

export function clearSdkEntries(storage: Storage): void {
  for (const key of sdkKeys(storage)) storage.removeItem(key);
}

export function moveSdkEntries(from: Storage, to: Storage): void {
  for (const key of sdkKeys(from)) {
    const value = from.getItem(key);
    if (value !== null) to.setItem(key, value);
    from.removeItem(key);
  }
}

/**
 * Pluggable SDK cache. Tokens follow Stay signed in: sessionStorage unless
 * the preference is on, then localStorage. Removing an entry clears both.
 */
export class TokenCacheStore implements ICacheStore {
  constructor(
    private readonly sessionStore: Storage,
    private readonly localStore: Storage
  ) {}

  private active(): Storage {
    return staySignedIn ? this.localStore : this.sessionStore;
  }

  get(key: string): string | null {
    return this.active().getItem(key);
  }

  set(key: string, value: string): void {
    this.active().setItem(key, value);
  }

  remove(key: string): void {
    this.sessionStore.removeItem(key);
    this.localStore.removeItem(key);
  }
}

export function createTokenCache(sessionStore: Storage, localStore: Storage): GenericCache {
  return new GenericCache(new TokenCacheStore(sessionStore, localStore));
}

export interface ClearedSpotifySession {
  sdk: null;
  profile: null;
  error: null;
}

/** Drop tokens from both storages and the in-memory session fields. */
export function signOutOfSpotify(
  sdk: { logOut(): void } | null,
  sessionStore: Storage,
  localStore: Storage
): ClearedSpotifySession {
  try {
    sdk?.logOut();
  } catch (error) {
    console.error(error);
  }
  clearSdkEntries(sessionStore);
  clearSdkEntries(localStore);
  return { sdk: null, profile: null, error: null };
}

export function shouldRestoreSession(
  href: string,
  sessionStore: Storage,
  localStore: Storage
): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.searchParams.has("error")) return false;
  if (url.searchParams.has("code")) return true;
  const store = staySignedIn ? localStore : sessionStore;
  return store.getItem(ACCESS_TOKEN_STORAGE_KEY) !== null;
}
