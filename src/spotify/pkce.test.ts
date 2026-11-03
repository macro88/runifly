import { describe, expect, it } from "vitest";
import {
  OAUTH_ERROR_MESSAGE,
  STALE_PKCE_MESSAGE,
  hrefWithoutSpotifyCallback,
  oauthCallbackMessage,
  stalePkceRecovery,
} from "./pkce";

describe("stalePkceRecovery", () => {
  it("removes the callback code so the next sign-in does not reuse it", () => {
    const recovery = stalePkceRecovery(
      new Error("No verifier found in cache - can't validate query string callback parameters."),
      "http://127.0.0.1:5173/callback?code=dead-code&state=abc&keep=1#section"
    );

    expect(recovery).not.toBeNull();
    const next = new URL(recovery!.href);
    expect(next.searchParams.has("code")).toBe(false);
    expect(next.searchParams.has("state")).toBe(false);
    expect(next.searchParams.get("keep")).toBe("1");
    expect(next.hash).toBe("#section");
    expect(recovery!.message).toBe(STALE_PKCE_MESSAGE);
    expect(recovery!.message.toLowerCase()).not.toContain("reload");
  });

  it("leaves the url alone for other sign-in errors", () => {
    const href = "http://127.0.0.1:5173/?code=still-here";
    expect(stalePkceRecovery(new Error("Spotify sign-in failed."), href)).toBeNull();
  });

  it("reads an OAuth error without keeping the query on the next sign-in", () => {
    const href = "https://runifly.com/?error=access_denied&error_description=Nope&keep=1";
    expect(oauthCallbackMessage(href)).toBe(OAUTH_ERROR_MESSAGE);
    expect(oauthCallbackMessage("https://runifly.com/")).toBeNull();

    const next = new URL(hrefWithoutSpotifyCallback(href));
    expect(next.searchParams.has("error")).toBe(false);
    expect(next.searchParams.has("error_description")).toBe(false);
    expect(next.searchParams.get("keep")).toBe("1");
  });
});
