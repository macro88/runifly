import { describe, expect, it, beforeEach } from "vitest";
import { CLIENT_ID_STORAGE_KEY } from "./clientId";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  SDK_KEY_PREFIX,
  STAY_SIGNED_IN_KEY,
  clearSdkEntries,
  createTokenCache,
  loadStaySignedIn,
  setStaySignedInPreference,
  shouldRestoreSession,
  signOutOfSpotify,
  staySignedInPreference,
} from "./tokenStore";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear() {
      items.clear();
    },
    getItem(key: string) {
      return items.has(key) ? (items.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(items.keys())[index] ?? null;
    },
    removeItem(key: string) {
      items.delete(key);
    },
    setItem(key: string, value: string) {
      items.set(key, String(value));
    },
  };
}

const token = {
  access_token: "token-a",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: "refresh-a",
  expires: Date.now() + 60_000,
};

describe("token storage", () => {
  let sessionStore: Storage;
  let localStore: Storage;

  beforeEach(() => {
    sessionStore = memoryStorage();
    localStore = memoryStorage();
    loadStaySignedIn(localStore);
  });

  it("writes tokens to sessionStorage unless Stay signed in is on", async () => {
    const cache = createTokenCache(sessionStore, localStore);
    cache.setCacheItem(ACCESS_TOKEN_STORAGE_KEY, token);

    expect(staySignedInPreference()).toBe(false);
    expect(sessionStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toContain("token-a");
    expect(localStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    await expect(cache.get(ACCESS_TOKEN_STORAGE_KEY)).resolves.toMatchObject({
      access_token: "token-a",
    });

    setStaySignedInPreference(localStore, true, sessionStore);
    expect(localStore.getItem(STAY_SIGNED_IN_KEY)).toBe("1");
    expect(sessionStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toContain("token-a");
    await expect(cache.get(ACCESS_TOKEN_STORAGE_KEY)).resolves.toMatchObject({
      access_token: "token-a",
    });

    const verifier = { verifier: "pkce", expiresOnAccess: false };
    cache.setCacheItem(`${SDK_KEY_PREFIX}verifier`, verifier);
    expect(localStore.getItem(`${SDK_KEY_PREFIX}verifier`)).toContain("pkce");
    expect(sessionStore.getItem(`${SDK_KEY_PREFIX}verifier`)).toBeNull();
  });

  it("moves tokens back to sessionStorage when Stay signed in is turned off", async () => {
    setStaySignedInPreference(localStore, true, sessionStore);
    const cache = createTokenCache(sessionStore, localStore);
    cache.setCacheItem(ACCESS_TOKEN_STORAGE_KEY, token);

    setStaySignedInPreference(localStore, false, sessionStore);

    expect(localStore.getItem(STAY_SIGNED_IN_KEY)).toBeNull();
    expect(localStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(sessionStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toContain("token-a");
    await expect(cache.get(ACCESS_TOKEN_STORAGE_KEY)).resolves.toMatchObject({
      access_token: "token-a",
    });
  });

  it("drops indefinite localStorage tokens when Stay signed in is off", () => {
    localStore.setItem(ACCESS_TOKEN_STORAGE_KEY, "{\"access_token\":\"old\"}");
    localStore.setItem(CLIENT_ID_STORAGE_KEY, "a".repeat(32));
    loadStaySignedIn(localStore);
    expect(localStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStore.getItem(CLIENT_ID_STORAGE_KEY)).toBe("a".repeat(32));
  });

  it("signs out by clearing both storages and the in-memory session", () => {
    sessionStore.setItem(`${SDK_KEY_PREFIX}verifier`, "session-verifier");
    localStore.setItem(ACCESS_TOKEN_STORAGE_KEY, "{\"access_token\":\"local\"}");
    localStore.setItem(CLIENT_ID_STORAGE_KEY, "b".repeat(32));
    localStore.setItem(STAY_SIGNED_IN_KEY, "1");
    const calls: string[] = [];

    const cleared = signOutOfSpotify(
      { logOut: () => calls.push("logOut") },
      sessionStore,
      localStore
    );

    expect(calls).toEqual(["logOut"]);
    expect(cleared).toEqual({ sdk: null, profile: null, error: null });
    expect(sessionStore.length).toBe(0);
    expect(localStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStore.getItem(CLIENT_ID_STORAGE_KEY)).toBe("b".repeat(32));
    expect(localStore.getItem(STAY_SIGNED_IN_KEY)).toBe("1");
  });

  it("still clears tokens when logOut throws", () => {
    sessionStore.setItem(ACCESS_TOKEN_STORAGE_KEY, "token");
    signOutOfSpotify(
      {
        logOut: () => {
          throw new Error("already signed out");
        },
      },
      sessionStore,
      localStore
    );
    expect(sessionStore.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("restores a session from the active storage, not after an OAuth error", () => {
    expect(
      shouldRestoreSession("https://runifly.com/?code=abc", sessionStore, localStore)
    ).toBe(true);
    expect(
      shouldRestoreSession(
        "https://runifly.com/?error=access_denied",
        sessionStore,
        localStore
      )
    ).toBe(false);

    sessionStore.setItem(ACCESS_TOKEN_STORAGE_KEY, "{}");
    expect(
      shouldRestoreSession("https://runifly.com/", sessionStore, localStore)
    ).toBe(true);

    clearSdkEntries(sessionStore);
    setStaySignedInPreference(localStore, true, sessionStore);
    localStore.setItem(ACCESS_TOKEN_STORAGE_KEY, "{}");
    expect(
      shouldRestoreSession("https://runifly.com/", sessionStore, localStore)
    ).toBe(true);
    expect(
      shouldRestoreSession("https://runifly.com/", memoryStorage(), localStore)
    ).toBe(true);
  });
});
