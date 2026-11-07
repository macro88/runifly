import { describe, expect, it } from "vitest";
import { createFakeGpx } from "../utils/gpxUtils";
import {
  courseKilometres,
  elevationSamples,
  kilometreX,
  wholeKilometreTicks,
} from "./elevationGeometry";

describe("elevation chart geometry", () => {
  it("places a kilometre by its share of a fractional route", () => {
    const course = createFakeGpx("out", 1.6, 300);
    const routeKilometres = courseKilometres(course.points);
    const width = 1600;

    expect(routeKilometres).toBe(1.6);
    expect(course.laps.map((lap) => lap.totalDistance)).toEqual([1000, 600]);
    expect(elevationSamples(course.points).map((sample) => sample.kilometre)).toEqual([
      0, 1, 1.6,
    ]);

    expect(kilometreX(0, routeKilometres, width)).toBe(0);
    expect(kilometreX(0.6, routeKilometres, width)).toBeCloseTo(600, 5);
    expect(kilometreX(1, routeKilometres, width)).toBeCloseTo(1000, 5);
    expect(kilometreX(1.4, routeKilometres, width)).toBeCloseTo(1400, 5);
    expect(kilometreX(1.6, routeKilometres, width)).toBe(width);
    expect(
      kilometreX(1.6, routeKilometres, width) - kilometreX(1, routeKilometres, width)
    ).toBeCloseTo(600, 5);
  });

  it("keeps axis labels on whole kilometres for a short route", () => {
    expect(wholeKilometreTicks(1.2)).toEqual([0, 1]);
    expect(wholeKilometreTicks(1.6)).toEqual([0, 1]);
    expect(wholeKilometreTicks(4)).toEqual([0, 1, 2, 3, 4]);
    expect(wholeKilometreTicks(0.6)).toEqual([0]);
  });

  it("plots the generated 42.196 km course from 0 through the final 196 m", () => {
    const course = createFakeGpx("fake", 42.196, 5);
    const series = elevationSamples(course.points);
    const kilometres = series.map((sample) => sample.kilometre);
    const wholeKilometres = kilometres.filter((kilometre) =>
      Number.isInteger(kilometre)
    );

    expect(course.points[0].totalDistance).toBe(0);
    expect(series[0]).toEqual({
      kilometre: 0,
      elevation: course.points[0].elevation,
    });
    expect(series[1]?.kilometre).toBe(1);
    expect(wholeKilometres).toEqual(
      Array.from({ length: 43 }, (_, kilometre) => kilometre)
    );

    const end = series[series.length - 1];
    expect(end.kilometre).toBeCloseTo(42.196, 5);
    expect(end.elevation).toBe(course.points[course.points.length - 1].elevation);
    expect(courseKilometres(course.points)).toBeCloseTo(42.196, 5);
    expect(kilometres[kilometres.indexOf(42) + 1]).toBeCloseTo(42.196, 5);
  });
});
