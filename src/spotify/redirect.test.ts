import { describe, expect, it } from "vitest";
import {
  hrefOnCallbackOrigin,
  isSpotifyRedirectUri,
  resolveSpotifyRedirectUri,
} from "./redirect";

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
        "/",
        "http://127.0.0.1:4173/?fixtures=1",
      ),
    ).toBe("http://127.0.0.1:4173/");
  });

  it("derives the production callback from the page origin and the built base", () => {
    const redirect = resolveSpotifyRedirectUri(
      "https://old.example.pages.dev/",
      "/",
      "https://runifly.com/?code=abc&state=xyz",
    );

    expect(redirect).toBe("https://runifly.com/");
    expect(isSpotifyRedirectUri(redirect)).toBe(true);
  });

  it("does not send a production visitor to a loopback variable", () => {
    expect(
      resolveSpotifyRedirectUri(
        "http://127.0.0.1:5173/",
        "/",
        "https://runifly.com/",
      ),
    ).toBe("https://runifly.com/");
  });

  it("falls back to the configured origin when the page URL is unusable", () => {
    expect(
      resolveSpotifyRedirectUri("https://runifly.com/", "/", ""),
    ).toBe("https://runifly.com/");
  });

  it("moves a localhost page onto the 127.0.0.1 callback origin", () => {
    expect(
      hrefOnCallbackOrigin(
        "http://localhost:5173/?fixtures=1#pace",
        "http://127.0.0.1:5173",
        "/",
      ),
    ).toBe("http://127.0.0.1:5173/?fixtures=1#pace");
    expect(
      hrefOnCallbackOrigin(
        "http://127.0.0.1:5173/?fixtures=1",
        "http://127.0.0.1:5173",
        "/",
      ),
    ).toBeUndefined();
    expect(
      hrefOnCallbackOrigin("https://runifly.com/", "http://127.0.0.1:5173/", "/"),
    ).toBeUndefined();
  });

  it("returns undefined when the configured value is missing or not a URL", () => {
    expect(
      resolveSpotifyRedirectUri(undefined, "/", "https://runifly.com/"),
    ).toBeUndefined();
    expect(
      resolveSpotifyRedirectUri("not a url", "/", "https://runifly.com/"),
    ).toBeUndefined();
  });
});
