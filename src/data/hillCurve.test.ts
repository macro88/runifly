import { describe, expect, it } from "vitest";
import { FIXTURE_TRACKS } from "../fixtures/playlist";
import type { RuniflySong } from "../hooks/useSpotifyPlaylist";
import { createFakeGpx } from "../utils/gpxUtils";
import {
  adjustedRunSecondsForDistance,
  buildTimeDistanceCurve,
  classifyCourseElevation,
  clampClimbCost,
  effectiveHillAdjust,
  kilometresAtTime,
  parseClimbCost,
  parseHillAdjust,
  samplesFromPoints,
  timingCurveForCourse,
  type HillSample,
} from "./hillCurve";
import { updateTimingData } from "./timing";

const PACE = 300;

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

function laps(songs: RuniflySong[]) {
  return songs.map((entry) => ({
    name: entry.name,
    raceTimeFrom: entry.raceTimeFrom,
    raceTimeTo: entry.raceTimeTo,
    lapFrom: entry.lapFrom,
    lapTo: entry.lapTo,
  }));
}

const fixtureSongs = FIXTURE_TRACKS.map((track) =>
  song(track.name, track.duration_ms / 1000)
);

/** Fixture Climb: flat to 2 km, then 150 m over the third kilometre. */
const fixtureSamples: HillSample[] = [
  { distanceMetres: 1000, elevationGainMetres: 0 },
  { distanceMetres: 1000, elevationGainMetres: 0 },
  { distanceMetres: 1000, elevationGainMetres: 150 },
  { distanceMetres: 1000, elevationGainMetres: 0 },
];

describe("buildTimeDistanceCurve", () => {
  it("adds climb seconds and leaves a descent at flat pace", () => {
    const curve = buildTimeDistanceCurve(
      [
        { distanceMetres: 1000, elevationGainMetres: 50 },
        { distanceMetres: 1000, elevationGainMetres: 0 },
      ],
      PACE,
      6
    );

    expect(curve.totalElevationGainMetres).toBe(50);
    expect(curve.climbCostSeconds).toBeCloseTo(50 * 6, 8);
    expect(curve.totalTimeSeconds).toBeCloseTo(600 + 300, 8);
    expect(curve.totalTimeSeconds).toBeGreaterThan(2 * PACE);
    expect(parseFloat(kilometresAtTime(curve, 900).toFixed(2))).toBe(2);
    expect(parseFloat(kilometresAtTime(curve, 750).toFixed(2))).toBe(1.5);
  });

  it("keeps total climb cost equal to total gain times cost", () => {
    const curve = buildTimeDistanceCurve(
      [
        { distanceMetres: 250, elevationGainMetres: 12.25 },
        { distanceMetres: 800, elevationGainMetres: 0.5 },
        { distanceMetres: 100, elevationGainMetres: 3 },
      ],
      295,
      6
    );
    const gain = 12.25 + 0.5 + 3;

    expect(curve.totalElevationGainMetres).toBeCloseTo(gain, 8);
    expect(curve.climbCostSeconds).toBeCloseTo(gain * 6, 8);
    expect(curve.totalTimeSeconds).toBeCloseTo((1.15 * 295) + gain * 6, 8);
  });

  it("does not speed a song up on a descent", () => {
    const climbed = buildTimeDistanceCurve(
      [
        { distanceMetres: 1000, elevationGainMetres: 80 },
        { distanceMetres: 1000, elevationGainMetres: 0 },
      ],
      PACE,
      6
    );
    const flat = buildTimeDistanceCurve(
      [
        { distanceMetres: 1000, elevationGainMetres: 0 },
        { distanceMetres: 1000, elevationGainMetres: 0 },
      ],
      PACE,
      6
    );

    expect(climbed.totalTimeSeconds).toBe(flat.totalTimeSeconds + 80 * 6);
    expect(kilometresAtTime(climbed, 600)).toBeLessThan(kilometresAtTime(flat, 600));
  });

  it("matches flat kilometres when the climb cost is 0", () => {
    const curve = buildTimeDistanceCurve(fixtureSamples, PACE, 0);
    const times = [0, 180, 420, 510.5, 1200, 1500];

    expect(curve.climbCostSeconds).toBe(0);
    expect(curve.totalTimeSeconds).toBe(1200);
    for (const time of times) {
      expect(kilometresAtTime(curve, time)).toBe(time / PACE);
    }
  });

  it("places a boundary on the fixture climb behind the flat pace", () => {
    const pace = 180;
    const curve = buildTimeDistanceCurve(fixtureSamples, pace, 6);

    // 4 km at 3:00 plus 150 m * 6 s.
    expect(curve.totalTimeSeconds).toBe(4 * pace + 150 * 6);
    expect(curve.climbCostSeconds).toBeCloseTo(150 * 6, 8);
    // The Climb ends at 420 s. Flat pace is 2.33 km, on the hill.
    // The hill segment starts at 360 s / 2 km and costs 1080 s for that kilometre.
    expect(parseFloat((420 / pace).toFixed(2))).toBe(2.33);
    expect(parseFloat(kilometresAtTime(curve, 420).toFixed(2))).toBe(2.06);
    expect(parseFloat(kilometresAtTime(curve, 510.5).toFixed(2))).toBe(2.14);
  });

  it("leaves fixture songs that finish before the climb on the flat kilometres", () => {
    const curve = buildTimeDistanceCurve(fixtureSamples, PACE, 6);

    expect(curve.totalTimeSeconds).toBe(2100);
    expect(updateTimingData(fixtureSongs, PACE, curve)).toEqual(
      updateTimingData(fixtureSongs, PACE)
    );
  });
});

describe("timingCurveForCourse", () => {
  const climbed = [
    { distance: 0, elevation: 30, elevationGain: 0 },
    { distance: 1000, elevation: 80, elevationGain: 50 },
  ];

  it("returns null when the toggle is off, the cost is 0, or the gain is 0", () => {
    expect(timingCurveForCourse(climbed, PACE, 6, false)).toBeNull();
    expect(timingCurveForCourse(climbed, PACE, 0, true)).toBeNull();

    const fake = createFakeGpx("fake", 42.196, PACE);
    expect(classifyCourseElevation(fake.points)).toBe("flat");
    expect(timingCurveForCourse(fake.points, PACE, 6, true)).toBeNull();
    expect(
      updateTimingData(fixtureSongs, PACE, timingCurveForCourse(fake.points, PACE, 6, true))
    ).toEqual(updateTimingData(fixtureSongs, PACE));
  });

  it("walks recorded gain and ignores a non-positive gain", () => {
    const points = [
      { distance: 0, elevation: 100, elevationGain: 0 },
      { distance: 1000, elevation: 150, elevationGain: 50 },
      { distance: 0, elevation: 150, elevationGain: 0 },
      { distance: 1000, elevation: 80, elevationGain: -10 },
    ];
    const curve = timingCurveForCourse(points, PACE, 6, true);

    expect(samplesFromPoints(points)).toEqual([
      { distanceMetres: 1000, elevationGainMetres: 50 },
      { distanceMetres: 1000, elevationGainMetres: 0 },
    ]);
    expect(curve?.totalElevationGainMetres).toBe(50);
    expect(curve?.totalTimeSeconds).toBe(600 + 300);
  });

  it("does not mutate the samples it was given", () => {
    const samples: HillSample[] = [{ distanceMetres: 500, elevationGainMetres: 4 }];
    const before = structuredClone(samples);

    buildTimeDistanceCurve(samples, PACE, 6);

    expect(samples).toEqual(before);
  });
});

describe("adjustedRunSecondsForDistance", () => {
  // Fixture Climb at 5:00/km: 4 * 300 + 150 * 6.
  const fixtureSeconds = 2100;

  it("scales a 4 km climb to a 10 km entered distance", () => {
    const seconds = adjustedRunSecondsForDistance(fixtureSeconds, 4, 10);

    expect(seconds).toBe(5250);
    expect(seconds).toBeGreaterThan(10 * 300);
  });

  it("scales a 4 km climb down when the entered distance is shorter", () => {
    const seconds = adjustedRunSecondsForDistance(fixtureSeconds, 4, 2);

    expect(seconds).toBe(1050);
    expect(seconds).toBeGreaterThan(2 * 300);
  });

  it("keeps the GPX total when the form distance matches", () => {
    expect(adjustedRunSecondsForDistance(fixtureSeconds, 4, 4)).toBe(fixtureSeconds);
  });
});

describe("course elevation and stored hill settings", () => {
  it("treats all-zero elevation as missing and a real gain as usable", () => {
    expect(
      classifyCourseElevation([
        { elevation: 0, elevationGain: 40 },
        { elevation: 0, elevationGain: 0 },
      ])
    ).toBe("missing");
    expect(
      classifyCourseElevation([
        { elevation: 30, elevationGain: 0 },
        { elevation: 30, elevationGain: 0 },
      ])
    ).toBe("flat");
    expect(
      classifyCourseElevation([
        { elevation: 30, elevationGain: 0 },
        { elevation: 180, elevationGain: 150 },
      ])
    ).toBe("usable");
    expect(classifyCourseElevation([])).toBe("missing");
  });

  it("defaults the toggle from the course until a choice is stored", () => {
    expect(effectiveHillAdjust(null, "usable")).toBe(true);
    expect(effectiveHillAdjust(null, "flat")).toBe(false);
    expect(effectiveHillAdjust(null, "missing")).toBe(false);
    expect(effectiveHillAdjust(false, "usable")).toBe(false);
    expect(effectiveHillAdjust(true, "flat")).toBe(true);
    expect(effectiveHillAdjust(true, "missing")).toBe(false);
  });

  it("reads a stored cost of 0 and rejects anything outside 0 to 20", () => {
    expect(parseClimbCost(null)).toBe(6);
    expect(parseClimbCost("0")).toBe(0);
    expect(parseClimbCost("6")).toBe(6);
    expect(parseClimbCost("20")).toBe(20);
    expect(parseClimbCost("21")).toBe(6);
    expect(parseClimbCost("6.5")).toBe(6);
    expect(parseClimbCost("-1")).toBe(6);
    expect(parseHillAdjust(null)).toBeNull();
    expect(parseHillAdjust("1")).toBe(true);
    expect(parseHillAdjust("0")).toBe(false);
    expect(parseHillAdjust("yes")).toBeNull();
    expect(clampClimbCost(6.4)).toBe(6);
    expect(clampClimbCost(20.6)).toBe(20);
    expect(clampClimbCost(-3)).toBe(0);
    expect(clampClimbCost(Number.NaN)).toBe(6);
  });
});

describe("updateTimingData on a curve", () => {
  it("follows the curve for song boundaries and keeps race times", () => {
    const curve = buildTimeDistanceCurve(
      [
        { distanceMetres: 1000, elevationGainMetres: 0 },
        { distanceMetres: 1000, elevationGainMetres: 100 },
      ],
      PACE,
      6
    );
    const input = [song("Flat", 180), song("Hill", 240)];
    const before = structuredClone(input);

    const timed = updateTimingData(input, PACE, curve);

    expect(input).toEqual(before);
    expect(laps(timed)).toEqual([
      {
        name: "Flat",
        raceTimeFrom: 0,
        raceTimeTo: 180,
        lapFrom: 0,
        lapTo: 0.6,
      },
      {
        name: "Hill",
        raceTimeFrom: 180,
        raceTimeTo: 420,
        lapFrom: 0.6,
        lapTo: 1.13,
      },
    ]);
    expect(laps(updateTimingData(input, PACE))).toEqual([
      {
        name: "Flat",
        raceTimeFrom: 0,
        raceTimeTo: 180,
        lapFrom: 0,
        lapTo: 0.6,
      },
      {
        name: "Hill",
        raceTimeFrom: 180,
        raceTimeTo: 420,
        lapFrom: 0.6,
        lapTo: 1.4,
      },
    ]);
  });

  it("matches flat placement for a zero-cost curve and for no curve", () => {
    const curve = buildTimeDistanceCurve(fixtureSamples, PACE, 0);

    expect(laps(updateTimingData(fixtureSongs, PACE, null))).toEqual(
      laps(updateTimingData(fixtureSongs, PACE))
    );
    expect(laps(updateTimingData(fixtureSongs, PACE, curve))).toEqual(
      laps(updateTimingData(fixtureSongs, PACE))
    );
  });
});
