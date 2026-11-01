import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AuthorizationCodeWithPKCEStrategy,
  SpotifyApi,
  type UserProfile,
} from "@spotify/web-api-ts-sdk";
import { isFixturesMode } from "../fixtures/playlist";
import { isSpotifyRedirectUri } from "./redirect";
import { RUNIFLY_SPOTIFY_SCOPES, SPOTIFY_SCOPE_STORAGE_KEY } from "./scopes";

export interface SpotifyAuthState {
  sdk: SpotifyApi | null;
  profile: UserProfile | null;
  error: Error | null;
}

const SpotifyAuthContext = createContext<SpotifyAuthState | undefined>(
  undefined
);

let pendingSdk: Promise<SpotifyApi | null> | null = null;

function toAuthError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "Spotify sign-in failed.";
  if (message.includes("No verifier found in cache")) {
    return new Error("Spotify sign-in was interrupted. Reload the page to try again.");
  }
  if (error instanceof Error) return error;
  return new Error(message);
}

/**
 * One SDK and one PKCE exchange for the whole page. React StrictMode runs the
 * effect twice, and Spotify's authorization code can be exchanged only once.
 */
function loadSdk(): Promise<SpotifyApi | null> {
  if (!pendingSdk) {
    pendingSdk = authenticateSdk().catch((error: unknown) => {
      pendingSdk = null;
      throw error;
    });
  }
  return pendingSdk;
}

async function authenticateSdk(): Promise<SpotifyApi | null> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUrl = import.meta.env.VITE_REDIRECT_TARGET;
  if (!clientId) {
    throw new Error("Set VITE_SPOTIFY_CLIENT_ID in .env.");
  }
  if (!isSpotifyRedirectUri(redirectUrl)) {
    throw new Error("Redirect URI must be http://127.0.0.1:<port> or https.");
  }

  const sdk = new SpotifyApi(
    new AuthorizationCodeWithPKCEStrategy(clientId, redirectUrl, [
      ...RUNIFLY_SPOTIFY_SCOPES,
    ])
  );

  const scopeMarker = RUNIFLY_SPOTIFY_SCOPES.join(" ");
  if (window.localStorage.getItem(SPOTIFY_SCOPE_STORAGE_KEY) !== scopeMarker) {
    sdk.logOut();
    window.localStorage.setItem(SPOTIFY_SCOPE_STORAGE_KEY, scopeMarker);
  }

  const result = await sdk.authenticate();
  if (!result.authenticated) return null;
  return sdk;
}

export function SpotifyAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpotifyAuthState>({
    sdk: null,
    profile: null,
    error: null,
  });

  useEffect(() => {
    if (isFixturesMode()) return;
    let cancelled = false;

    (async () => {
      try {
        const sdk = await loadSdk();
        if (!sdk || cancelled) return;
        let profile: UserProfile | null = null;
        try {
          profile = await sdk.currentUser.profile();
        } catch (profileError) {
          console.error(profileError);
        }
        if (cancelled) return;
        setState({ sdk, profile, error: null });
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setState({ sdk: null, profile: null, error: toAuthError(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SpotifyAuthContext.Provider value={state}>
      {children}
    </SpotifyAuthContext.Provider>
  );
}

// Hook lives next to its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useSpotifyAuth(): SpotifyAuthState {
  const value = useContext(SpotifyAuthContext);
  if (!value) {
    throw new Error("useSpotifyAuth must be used within SpotifyAuthProvider");
  }
  return value;
}
