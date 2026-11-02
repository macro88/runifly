import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { describe, expect, it } from "vitest";
import {
  calculatePace,
  calculateTargetTime,
  starterTargetTime,
} from "./pace";

dayjs.extend(duration);

describe("pace form maths", () => {
  it("starts at the same 5:30/km the old mount effect published", () => {
    const distanceKm = 42.196;
    const target = starterTargetTime(distanceKm);
    const pace = calculatePace(target, distanceKm);

    expect(pace.asSeconds()).toBe(5.5 * 60);
    expect(calculateTargetTime(pace, distanceKm).asSeconds()).toBe(
      target.asSeconds()
    );
  });

  it("keeps the target when distance changes and keeps the pace when the target is scaled", () => {
    const distanceKm = 42.196;
    const nextDistanceKm = 4;
    const target = starterTargetTime(distanceKm);
    const keptTargetPace = calculatePace(target, nextDistanceKm);

    expect(calculateTargetTime(keptTargetPace, nextDistanceKm).asSeconds()).toBe(
      target.asSeconds()
    );

    const pace = calculatePace(target, distanceKm);
    const scaledTarget = calculateTargetTime(pace, nextDistanceKm);
    expect(calculatePace(scaledTarget, nextDistanceKm).asSeconds()).toBe(
      pace.asSeconds()
    );
  });
});
