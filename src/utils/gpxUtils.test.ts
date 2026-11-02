import { DOMParser as XmldomParser } from "@xmldom/xmldom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import fixtureClimb from "../../fixtures/fixture-climb.gpx?raw";
import {
  aggregateLaps,
  createFakeGpx,
  parseFile,
  totalDistance,
  type Gpx,
  type PointDetail,
} from "./gpxUtils";

/**
 * Node has no DOMParser. The app uses the browser one. This test substitute
 * reports fatal XML errors the way the browser's parsererror document does.
 */
class TestDOMParser {
  parseFromString(xml: string, type: string): Document {
    let fatal: Error | undefined;
    const parser = new XmldomParser({
      onError: (level: string, message: string) => {
        if (level === "fatalError") fatal = new Error(message);
      },
    });
    const doc = parser.parseFromString(xml, type);
    if (fatal) throw fatal;
    return doc as unknown as Document;
  }
}

beforeAll(() => {
  if (typeof globalThis.DOMParser === "undefined") {
    Object.defineProperty(globalThis, "DOMParser", {
      value: TestDOMParser,
      configurable: true,
      writable: true,
    });
  }
});

// Same northward step as fixtures/fixture-climb.gpx: 1 km on earthRadiusMeters.
const KILOMETRE_NORTH = 0.008993203637;
const START_LAT = 51.5;
const START_LON = -0.12;

function displayedKilometres(gpx: Gpx): number {
  return Number((totalDistance(gpx) / 1000).toFixed(2));
}

function trkpt(lat: number, lon: number, ele?: number): string {
  const elevation = ele === undefined ? "" : `<ele>${ele}</ele>`;
  return `<trkpt lat="${lat}" lon="${lon}">${elevation}</trkpt>`;
}

function rtept(lat: number, lon: number, ele?: number): string {
  const elevation = ele === undefined ? "" : `<ele>${ele}</ele>`;
  return `<rtept lat="${lat}" lon="${lon}">${elevation}</rtept>`;
}

function north(step: number, lon = START_LON): { lat: number; lon: number } {
  return { lat: START_LAT + step * KILOMETRE_NORTH, lon };
}

async function load(xml: string, filename: string): Promise<Gpx> {
  return parseFile(new File([xml], filename));
}

describe("parseFile geometry", () => {
  it("sums every track segment and does not add the gap between them", async () => {
    const first = north(0);
    const second = north(1);
    const gap = north(0, START_LON + 1);
    const gapEnd = north(1, START_LON + 1);
    const xml = `<gpx><trk><name>Paused</name><trkseg>${trkpt(first.lat, first.lon, 10)}${trkpt(second.lat, second.lon, 20)}</trkseg><trkseg>${trkpt(gap.lat, gap.lon, 30)}${trkpt(gapEnd.lat, gapEnd.lon, 40)}</trkseg></trk></gpx>`;

    const course = await load(xml, "paused.gpx");

    expect(course.name).toBe("Paused");
    expect(displayedKilometres(course)).toBe(2);
    expect(course.points).toHaveLength(4);
  });

  it("sums every track instead of keeping only the first", async () => {
    const a0 = north(0);
    const a1 = north(1);
    const b0 = north(0, START_LON + 1);
    const b1 = north(1, START_LON + 1);
    const xml = `<gpx><trk><name>Out</name><trkseg>${trkpt(a0.lat, a0.lon, 5)}${trkpt(a1.lat, a1.lon, 6)}</trkseg></trk><trk><name>Back</name><trkseg>${trkpt(b0.lat, b0.lon, 7)}${trkpt(b1.lat, b1.lon, 8)}</trkseg></trk></gpx>`;

    const course = await load(xml, "tracks.gpx");

    expect(course.name).toBe("Out");
    expect(displayedKilometres(course)).toBe(2);
  });

  it("measures a route when the file has no track", async () => {
    const start = north(0);
    const middle = north(1);
    const end = north(1.5);
    const xml = `<gpx><rte><name>Planned</name>${rtept(start.lat, start.lon, 4)}${rtept(middle.lat, middle.lon, 9)}${rtept(end.lat, end.lon)}</rte></gpx>`;

    const course = await load(xml, "route.gpx");

    expect(course.name).toBe("Planned");
    expect(displayedKilometres(course)).toBe(1.5);
    expect(course.points.every((point) => Number.isFinite(point.elevation))).toBe(
      true
    );
  });

  it("keeps a recorded track when the same file also contains a route", async () => {
    const start = north(0);
    const end = north(1);
    const xml = `<gpx><rte><name>Plan</name>${rtept(start.lat, start.lon, 1)}${rtept(start.lat, start.lon + 1, 1)}</rte><trk><name>Recorded</name><trkseg>${trkpt(start.lat, start.lon, 12)}${trkpt(end.lat, end.lon, 18)}</trkseg></trk></gpx>`;

    const course = await load(xml, "both.gpx");

    expect(course.name).toBe("Recorded");
    expect(displayedKilometres(course)).toBe(1);
  });

  it("loads a single point as a zero-length course", async () => {
    const only = north(0);
    const xml = `<gpx><trk><name>Pin</name><trkseg>${trkpt(only.lat, only.lon, 42)}</trkseg></trk></gpx>`;

    const course = await load(xml, "pin.gpx");

    expect(course.name).toBe("Pin");
    expect(course.points).toHaveLength(1);
    expect(displayedKilometres(course)).toBe(0);
    expect(
      course.laps.reduce((sum, lap) => sum + lap.totalDistance, 0)
    ).toBe(0);
  });

  it("keeps the distance when elevation is missing", async () => {
    const start = north(0);
    const end = north(1);
    const xml = `<gpx><trk><name>Flat</name><trkseg>${trkpt(start.lat, start.lon)}${trkpt(end.lat, end.lon)}</trkseg></trk></gpx>`;

    const course = await load(xml, "flat.gpx");

    expect(displayedKilometres(course)).toBe(1);
    expect(course.points.every((point) => Number.isFinite(point.elevation))).toBe(
      true
    );
    expect(
      course.laps.every((lap) => lap.elevations.every((elevation) => Number.isFinite(elevation)))
    ).toBe(true);
  });

  it("rejects a GPX with no points", async () => {
    await expect(load("<gpx></gpx>", "empty.gpx")).rejects.toThrow("Invalid GPX");
  });
});

function detail(
  distance: number,
  totalDistance: number,
  elevation = 10
): PointDetail {
  return {
    longitude: 0,
    latitude: 0,
    elevation,
    distance,
    totalDistance,
    elevationGain: 0,
    elevationLoss: 0,
    time: 0,
  };
}

describe("aggregateLaps", () => {
  it("splits on each kilometre and keeps the last lap inside the route", () => {
    const points = [
      detail(0, 0, 10),
      detail(600, 600, 20),
      detail(600, 1200, 30),
      detail(400, 1600, 25),
    ];

    const laps = aggregateLaps(points);

    expect(laps.map((lap) => lap.lap)).toEqual([1, 2]);
    expect(laps.map((lap) => lap.totalDistance)).toEqual([1000, 600]);
    expect(laps.reduce((sum, lap) => sum + lap.totalDistance, 0)).toBe(1600);
  });

  it("splits one long step into whole kilometres plus the remainder", () => {
    const laps = aggregateLaps([detail(0, 0), detail(2500, 2500)]);

    expect(laps.map((lap) => lap.lap)).toEqual([1, 2, 3]);
    expect(laps.map((lap) => lap.totalDistance)).toEqual([1000, 1000, 500]);
    expect(laps.reduce((sum, lap) => sum + lap.totalDistance, 0)).toBe(2500);
  });

  it("does not add an extra lap when the route ends on a kilometre", async () => {
    const course = await load(fixtureClimb, "fixture-climb.gpx");

    expect(course.laps.map((lap) => lap.lap)).toEqual([1, 2, 3, 4]);
    expect(course.laps.map((lap) => lap.totalDistance)).toEqual([
      1000, 1000, 1000, 1000,
    ]);
    expect(course.laps.map((lap) => lap.elevations)).toEqual([
      [30, 30],
      [30],
      [180],
      [180],
    ]);
  });
});

describe("createFakeGpx", () => {
  it("stores a fractional kilometre in metres", () => {
    const course = createFakeGpx("half", 4.5, 5);

    expect(totalDistance(course)).toBe(4500);
    expect(course.points.reduce((sum, point) => sum + point.distance, 0)).toBe(
      4500
    );
    expect(course.laps.map((lap) => lap.totalDistance)).toEqual([
      1000, 1000, 1000, 1000, 500,
    ]);
    expect(course.points[course.points.length - 1].time).toBe(22.5);
  });

  it("builds a course shorter than one kilometre", () => {
    const course = createFakeGpx("short", 0.25, 5);

    expect(course.points).toHaveLength(1);
    expect(totalDistance(course)).toBe(250);
    expect(course.laps.map((lap) => lap.totalDistance)).toEqual([250]);
    expect(course.points[0].time).toBe(1.25);
  });

  it("keeps the marathon fraction as 196 m", () => {
    const course = createFakeGpx("fake", 42.196, 5);

    expect(totalDistance(course)).toBe(42196);
    expect(course.laps[course.laps.length - 1].totalDistance).toBe(196);
    expect(course.laps.reduce((sum, lap) => sum + lap.totalDistance, 0)).toBe(
      42196
    );
  });

  it("leaves a whole number of kilometres on the kilometre", () => {
    const course = createFakeGpx("whole", 4, 5);

    expect(course.points).toHaveLength(4);
    expect(totalDistance(course)).toBe(4000);
    expect(course.laps.map((lap) => lap.totalDistance)).toEqual([
      1000, 1000, 1000, 1000,
    ]);
  });
});

describe("parseFile errors", () => {
  it("does not log when a course loads or when the file has no points", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await load(fixtureClimb, "fixture-climb.gpx");
      await expect(load("<gpx></gpx>", "empty.gpx")).rejects.toThrow(
        "Invalid GPX"
      );
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});

describe("measured length", () => {
  it("rounds each designed kilometre of the sample course to 1000 m", async () => {
    const course = await load(fixtureClimb, "fixture-climb.gpx");

    expect(course.points.map((point) => point.distance)).toEqual([
      0, 1000, 1000, 1000, 1000,
    ]);
    expect(course.points.map((point) => point.totalDistance)).toEqual([
      0, 1000, 2000, 3000, 4000,
    ]);
    expect(displayedKilometres(course)).toBe(4);
  });
});
