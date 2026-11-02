import { describe, expect, it } from "vitest";
import { isSpotifyRedirectUri, resolveSpotifyRedirectUri } from "./redirect";

describe("resolveSpotifyRedirectUri", () => {
  it("keeps the configured loopback origin when the address bar says localhost", () => {
    const redirect = resolveSpotifyRedirectUri(
      "http://127.0.0.1:5173",
      "/",
      "http://localhost:5173/?fixtures=1",
    );

    expect(redirect).toBe("http://127.0.0.1:5173/");
    expect(isSpotifyRedirectUri(redirect)).toBe(true);
  });

  it("joins the production base onto the loopback origin", () => {
    expect(
      resolveSpotifyRedirectUri(
        "http://127.0.0.1:4173/",
        "/runifly/",
        "http://127.0.0.1:4173/runifly/?fixtures=1",
      ),
    ).toBe("http://127.0.0.1:4173/runifly/");
  });

  it("derives the GitHub Pages callback from the page origin and the built base", () => {
    const redirect = resolveSpotifyRedirectUri(
      "https://old.example.pages.dev/",
      "/runifly",
      "https://macro88.github.io/runifly/?code=abc&state=xyz",
    );

    expect(redirect).toBe("https://macro88.github.io/runifly/");
    expect(isSpotifyRedirectUri(redirect)).toBe(true);
  });

  it("does not send a Pages visitor to a loopback variable", () => {
    expect(
      resolveSpotifyRedirectUri(
        "http://127.0.0.1:5173/",
        "/runifly/",
        "https://macro88.github.io/runifly/",
      ),
    ).toBe("https://macro88.github.io/runifly/");
  });

  it("falls back to the configured origin when the page URL is unusable", () => {
    expect(
      resolveSpotifyRedirectUri("https://macro88.github.io/runifly/", "/runifly/", ""),
    ).toBe("https://macro88.github.io/runifly/");
  });

  it("returns undefined when the configured value is missing or not a URL", () => {
    expect(
      resolveSpotifyRedirectUri(undefined, "/runifly/", "https://macro88.github.io/runifly/"),
    ).toBeUndefined();
    expect(
      resolveSpotifyRedirectUri("not a url", "/runifly/", "https://macro88.github.io/runifly/"),
    ).toBeUndefined();
  });
});
