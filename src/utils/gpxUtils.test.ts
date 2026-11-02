import { DOMParser as XmldomParser } from "@xmldom/xmldom";
import { beforeAll, describe, expect, it } from "vitest";
import { parseFile, totalDistance, type Gpx } from "./gpxUtils";

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
