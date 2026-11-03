import { describe, expect, it } from "vitest";
import {
  SPOTIFY_RATE_LIMIT_MESSAGE,
  SPOTIFY_USER_MANAGEMENT_MESSAGE,
  messageForSpotifyError,
  spotifyStatusMessage,
} from "./httpStatus";

describe("spotify status messages", () => {
  it("explains a 403 that means the account is not on the app allowlist", () => {
    const body =
      '{"error":{"status":403,"message":"User not registered in the Developer Dashboard"}}';
    expect(spotifyStatusMessage(403, body)).toBe(SPOTIFY_USER_MANAGEMENT_MESSAGE);
    expect(spotifyStatusMessage(403, "Check settings on developer.spotify.com/dashboard")).toBe(
      SPOTIFY_USER_MANAGEMENT_MESSAGE
    );
    expect(spotifyStatusMessage(403, "Forbidden")).toBeNull();
    expect(spotifyStatusMessage(401, "")).toBeNull();
  });

  it("explains a 429 as rate limiting", () => {
    expect(spotifyStatusMessage(429, "")).toBe(SPOTIFY_RATE_LIMIT_MESSAGE);
    expect(spotifyStatusMessage(429, "Retry later")).toBe(SPOTIFY_RATE_LIMIT_MESSAGE);
  });

  it("maps SDK failures onto those messages", () => {
    expect(
      messageForSpotifyError(
        new Error(
          "Bad OAuth request (wrong consumer key, bad nonce, expired timestamp...). Body: {}"
        )
      )
    ).toBe(SPOTIFY_USER_MANAGEMENT_MESSAGE);
    expect(
      messageForSpotifyError(new Error("The app has exceeded its rate limits."))
    ).toBe(SPOTIFY_RATE_LIMIT_MESSAGE);
    expect(
      messageForSpotifyError({
        status: 403,
        message: "User not approved for the app",
      })
    ).toBe(SPOTIFY_USER_MANAGEMENT_MESSAGE);
    expect(messageForSpotifyError(new Error("Spotify sign-in failed."))).toBeNull();
    expect(messageForSpotifyError(null)).toBeNull();
  });
});
