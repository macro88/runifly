import { emptyAccessToken, SpotifyApi } from "@spotify/web-api-ts-sdk";

/** Bearer token from the SDK. The SDK still owns PKCE and refresh. */
export async function requireAccessToken(sdk: SpotifyApi): Promise<string> {
  const token = await sdk.getAccessToken();
  if (
    !token?.access_token ||
    token.access_token === emptyAccessToken.access_token
  ) {
    throw new Error("Spotify is not signed in.");
  }
  return token.access_token;
}
