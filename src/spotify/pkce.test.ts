import { describe, expect, it } from "vitest";
import { STALE_PKCE_MESSAGE, stalePkceRecovery } from "./pkce";

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
    expect(stalePkceRecovery(new Error("Set VITE_SPOTIFY_CLIENT_ID in .env."), href)).toBeNull();
  });
});
