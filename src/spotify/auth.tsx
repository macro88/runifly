import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SpotifyApi, type UserProfile } from "@spotify/web-api-ts-sdk";
import { isFixturesMode } from "../fixtures/playlist";
import {
  clientIdProblem,
  readStoredClientId,
  removeStoredClientId,
  writeStoredClientId,
} from "./clientId";
import { messageForSpotifyError } from "./httpStatus";
import {
  OAUTH_ERROR_MESSAGE,
  STALE_PKCE_MESSAGE,
  hrefWithoutSpotifyCallback,
  isStalePkceError,
  oauthCallbackMessage,
} from "./pkce";
import { hrefOnCallbackOrigin } from "./redirect";
import { abandonSpotifyConnection, loadSignedInSdk } from "./session";
import {
  loadStaySignedIn,
  setStaySignedInPreference,
  shouldRestoreSession,
  signOutOfSpotify,
} from "./tokenStore";

export interface SpotifyAuthState {
  sdk: SpotifyApi | null;
  profile: UserProfile | null;
  error: Error | null;
  oauthError: string | null;
  clientId: string | null;
  staySignedIn: boolean;
  signingIn: boolean;
  saveClientId: (value: string) => string | null;
  discardClientId: () => void;
  signIn: () => void;
  signOut: () => void;
  setStaySignedIn: (value: boolean) => void;
}

const SpotifyAuthContext = createContext<SpotifyAuthState | undefined>(
  undefined
);

let initialOauthError: string | null | undefined;

function readInitialOauthError(): string | null {
  if (initialOauthError !== undefined) return initialOauthError;
  const message = oauthCallbackMessage(window.location.href);
  if (message) {
    window.history.replaceState(
      {},
      document.title,
      hrefWithoutSpotifyCallback(window.location.href)
    );
  }
  initialOauthError = message;
  return message;
}

function replaceWithCallbackOrigin(): boolean {
  const next = hrefOnCallbackOrigin(
    window.location.href,
    import.meta.env.VITE_REDIRECT_TARGET,
    import.meta.env.BASE_URL,
  );
  if (!next) return false;
  window.location.replace(next);
  return true;
}

function toAuthError(error: unknown): Error {
  if (isStalePkceError(error)) return new Error(STALE_PKCE_MESSAGE);
  const hint = messageForSpotifyError(error);
  if (hint) return new Error(hint);
  if (
    error instanceof Error &&
    /failed to exchange code for token|invalid_client|invalid_grant/i.test(error.message)
  ) {
    return new Error(OAUTH_ERROR_MESSAGE);
  }
  if (error instanceof Error) return error;
  return new Error("Spotify sign-in failed.");
}

export function SpotifyAuthProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(() =>
    readStoredClientId(window.localStorage)
  );
  const [staySignedIn, setStaySignedInState] = useState(() =>
    loadStaySignedIn(window.localStorage)
  );
  const [sdk, setSdk] = useState<SpotifyApi | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(() =>
    readInitialOauthError()
  );
  const [signingIn, setSigningIn] = useState(false);
  const generation = useRef(0);

  const applySignedOut = useCallback(() => {
    generation.current += 1;
    const cleared = signOutOfSpotify(
      sdk,
      window.sessionStorage,
      window.localStorage
    );
    abandonSpotifyConnection();
    setSdk(cleared.sdk);
    setProfile(cleared.profile);
    setError(cleared.error);
    setSigningIn(false);
  }, [sdk]);

  const adoptSession = useCallback((id: string) => {
    const serial = generation.current;
    setSigningIn(true);
    void loadSignedInSdk(id)
      .then((result) => {
        if (serial !== generation.current || !result) return;
        setSdk(result.sdk);
        setProfile(result.profile);
        setError(result.error);
        if (!result.error) setOauthError(null);
      })
      .catch((signInError: unknown) => {
        console.error(signInError);
        if (serial !== generation.current) return;
        setSdk(null);
        setProfile(null);
        setError(toAuthError(signInError));
      })
      .finally(() => {
        if (serial === generation.current) setSigningIn(false);
      });
  }, []);

  useEffect(() => {
    if (replaceWithCallbackOrigin()) return;
    if (isFixturesMode()) return;
    if (initialOauthError) return;
    if (!clientId) return;
    if (
      !shouldRestoreSession(
        window.location.href,
        window.sessionStorage,
        window.localStorage
      )
    ) {
      return;
    }
    let cancelled = false;
    const serial = generation.current;
    void loadSignedInSdk(clientId)
      .then((result) => {
        if (cancelled || serial !== generation.current || !result) return;
        setSdk(result.sdk);
        setProfile(result.profile);
        setError(result.error);
        if (!result.error) setOauthError(null);
      })
      .catch((signInError: unknown) => {
        console.error(signInError);
        if (cancelled || serial !== generation.current) return;
        setSdk(null);
        setProfile(null);
        setError(toAuthError(signInError));
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const saveClientId = useCallback((value: string): string | null => {
    if (replaceWithCallbackOrigin()) return null;
    const problem = clientIdProblem(value);
    if (problem) return problem;
    writeStoredClientId(window.localStorage, value);
    setClientId(value.trim());
    setError(null);
    return null;
  }, []);

  const discardClientId = useCallback(() => {
    applySignedOut();
    removeStoredClientId(window.localStorage);
    setClientId(null);
    setOauthError(null);
  }, [applySignedOut]);

  const signIn = useCallback(() => {
    if (replaceWithCallbackOrigin()) return;
    if (!clientId) return;
    const problem = clientIdProblem(clientId);
    if (problem) {
      setError(new Error(problem));
      return;
    }
    adoptSession(clientId);
  }, [adoptSession, clientId]);

  const signOut = useCallback(() => {
    applySignedOut();
  }, [applySignedOut]);

  const setStaySignedIn = useCallback((value: boolean) => {
    setStaySignedInPreference(
      window.localStorage,
      value,
      window.sessionStorage
    );
    setStaySignedInState(value);
  }, []);

  const value = useMemo<SpotifyAuthState>(
    () => ({
      sdk,
      profile,
      error,
      oauthError,
      clientId,
      staySignedIn,
      signingIn,
      saveClientId,
      discardClientId,
      signIn,
      signOut,
      setStaySignedIn,
    }),
    [
      clientId,
      discardClientId,
      error,
      oauthError,
      profile,
      saveClientId,
      sdk,
      setStaySignedIn,
      signIn,
      signOut,
      signingIn,
      staySignedIn,
    ]
  );

  return (
    <SpotifyAuthContext.Provider value={value}>
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
