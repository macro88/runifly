import { describe, expect, it } from "vitest";
import {
  playlistCoverage,
  shortfallMinuteCount,
  shortfallWarning,
} from "./coverage";

describe("playlistCoverage", () => {
  it("is short when the music is shorter than the run", () => {
    const result = playlistCoverage({
      durationsSeconds: [100, 80],
      runSeconds: 200,
      crossfadeSeconds: 0,
    });

    expect(result.musicSeconds).toBe(180);
    expect(result.shortfallSeconds).toBe(20);
    expect(result.short).toBe(true);
  });

  it("is not short when the music matches the run", () => {
    const result = playlistCoverage({
      durationsSeconds: [100, 80],
      runSeconds: 180,
      crossfadeSeconds: 0,
    });

    expect(result.musicSeconds).toBe(180);
    expect(result.shortfallSeconds).toBe(0);
    expect(result.short).toBe(false);
  });

  it("is not short when the music covers the run", () => {
    const result = playlistCoverage({
      durationsSeconds: [100, 80],
      runSeconds: 150,
      crossfadeSeconds: 0,
    });

    expect(result.musicSeconds).toBe(180);
    expect(result.shortfallSeconds).toBe(0);
    expect(result.short).toBe(false);
  });

  it("subtracts the crossfade once for each gap between tracks", () => {
    const matched = playlistCoverage({
      durationsSeconds: [100, 100, 100],
      runSeconds: 280,
      crossfadeSeconds: 10,
    });
    const over = playlistCoverage({
      durationsSeconds: [100, 100],
      runSeconds: 200,
      crossfadeSeconds: 12,
    });

    expect(matched.musicSeconds).toBe(280);
    expect(matched.shortfallSeconds).toBe(0);
    expect(matched.short).toBe(false);
    expect(over.musicSeconds).toBe(188);
    expect(over.shortfallSeconds).toBe(12);
    expect(over.short).toBe(true);
    expect(
      playlistCoverage({
        durationsSeconds: [4, 4],
        runSeconds: 30,
        crossfadeSeconds: 12,
      }).musicSeconds
    ).toBe(0);
  });

  it("does not subtract crossfade when there are no tracks", () => {
    const result = playlistCoverage({
      durationsSeconds: [],
      runSeconds: 90,
      crossfadeSeconds: 12,
    });

    expect(result.musicSeconds).toBe(0);
    expect(result.shortfallSeconds).toBe(90);
    expect(result.short).toBe(true);
  });

  it("does not subtract crossfade when there is one track", () => {
    const result = playlistCoverage({
      durationsSeconds: [100],
      runSeconds: 100,
      crossfadeSeconds: 12,
    });

    expect(result.musicSeconds).toBe(100);
    expect(result.shortfallSeconds).toBe(0);
    expect(result.short).toBe(false);
  });
});

describe("shortfallWarning", () => {
  it("rounds to the nearest minute and uses the singular for one", () => {
    expect(shortfallMinuteCount(20)).toBe(1);
    expect(shortfallMinuteCount(60)).toBe(1);
    expect(shortfallMinuteCount(90)).toBe(2);
    expect(shortfallWarning(60)).toBe(
      "This playlist is about 1 minute short of your run. Music will stop early unless you add songs or shorten the course."
    );
    expect(shortfallWarning(90)).toBe(
      "This playlist is about 2 minutes short of your run. Music will stop early unless you add songs or shorten the course."
    );
  });

  it("describes the fixture songs on a 4 km course at 5:00 per kilometre", () => {
    const result = playlistCoverage({
      durationsSeconds: [180, 240, 90.5],
      runSeconds: 4 * 300,
      crossfadeSeconds: 0,
    });

    expect(result.short).toBe(true);
    expect(shortfallWarning(result.shortfallSeconds)).toBe(
      "This playlist is about 11 minutes short of your run. Music will stop early unless you add songs or shorten the course."
    );
  });
});
