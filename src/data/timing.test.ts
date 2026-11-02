import { describe, expect, it } from "vitest";
import { FIXTURE_TRACKS } from "../fixtures/playlist";
import type { RuniflySong } from "../hooks/useSpotifyPlaylist";
import { updateTimingData } from "./timing";

const PACE_SECONDS_PER_KM = 300;

function song(name: string, durationSeconds: number): RuniflySong {
  return {
    key: name,
    originalIndex: 0,
    name,
    artistName: "Fixture Artist",
    albumName: "Fixture Album",
    albumArt: "",
    songDuration: durationSeconds,
    raceTimeFrom: 0,
    raceTimeTo: 0,
    lapFrom: 0,
    lapTo: 0,
  };
}

describe("updateTimingData", () => {
  it("matches the hand calculation for the fixture tracks at 5:00/km", () => {
    const input = FIXTURE_TRACKS.map((track) =>
      song(track.name, track.duration_ms / 1000)
    );

    const timed = updateTimingData(input, PACE_SECONDS_PER_KM);

    // Today's baseline. A timing-formula change must update these figures
    // and the browser expectations in .cursor/skills/verify-runifly together.
    // Warm Up 180s, The Climb 240s, Easy Descent 90.5s.
    // Race times are cumulative seconds, then toFixed(2).
    // Kilometres are that rounded boundary / 300, then toFixed(2):
    // 0, 180/300 = 0.60, 420/300 = 1.40, 510.5/300 = 1.7016… → 1.70.
    expect(
      timed.map((entry) => ({
        name: entry.name,
        raceTimeFrom: entry.raceTimeFrom,
        raceTimeTo: entry.raceTimeTo,
        lapFrom: entry.lapFrom,
        lapTo: entry.lapTo,
      }))
    ).toEqual([
      {
        name: "Warm Up",
        raceTimeFrom: 0,
        raceTimeTo: 180,
        lapFrom: 0,
        lapTo: 0.6,
      },
      {
        name: "The Climb",
        raceTimeFrom: 180,
        raceTimeTo: 420,
        lapFrom: 0.6,
        lapTo: 1.4,
      },
      {
        name: "Easy Descent",
        raceTimeFrom: 420,
        raceTimeTo: 510.5,
        lapFrom: 1.4,
        lapTo: 1.7,
      },
    ]);
  });

  it("does not mutate the songs it was given", () => {
    const input = FIXTURE_TRACKS.map((track) =>
      song(track.name, track.duration_ms / 1000)
    );
    const before = structuredClone(input);

    updateTimingData(input, PACE_SECONDS_PER_KM);

    expect(input).toEqual(before);
  });
});
