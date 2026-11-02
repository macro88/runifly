import { describe, expect, it } from "vitest";
import { createFakeGpx } from "../utils/gpxUtils";
import {
  courseKilometres,
  elevationSamples,
  kilometreX,
} from "./elevationGeometry";

describe("elevation chart geometry", () => {
  it("places a kilometre by its share of a fractional route", () => {
    const course = createFakeGpx("out", 1.6, 300);
    const routeKilometres = courseKilometres(course.points);
    const width = 1600;

    expect(routeKilometres).toBe(1.6);
    expect(course.laps.map((lap) => lap.totalDistance)).toEqual([1000, 600]);
    expect(elevationSamples(course.points).map((sample) => sample.kilometre)).toEqual([
      1, 1.6,
    ]);

    expect(kilometreX(0, routeKilometres, width)).toBe(0);
    expect(kilometreX(0.6, routeKilometres, width)).toBeCloseTo(600, 5);
    expect(kilometreX(1, routeKilometres, width)).toBeCloseTo(1000, 5);
    expect(kilometreX(1.4, routeKilometres, width)).toBeCloseTo(1400, 5);
    expect(kilometreX(1.6, routeKilometres, width)).toBe(width);
    expect(kilometreX(1.6, routeKilometres, width) - kilometreX(1, routeKilometres, width)).toBeCloseTo(
      600,
      5
    );
  });
});
