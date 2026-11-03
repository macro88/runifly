import { DOMParser as XmldomParser } from "@xmldom/xmldom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import fixtureClimb from "../../fixtures/fixture-climb.gpx?raw";
import GpxParser from "./GpxParser";
import { parseFile } from "./gpxUtils";

/**
 * Node has no DOMParser. The app uses the browser one. This test substitute
 * reports fatal XML errors the way the browser's parsererror document does,
 * so parse() takes the same failure path.
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

describe("GpxParser", () => {
  it("parses a multi-trkpt fixture into numeric points", async () => {
    const xml = fixtureClimb;
    const parsed = await new GpxParser().parse(xml);

    expect(parsed.trk).toHaveLength(1);
    expect(parsed.trk[0].name).toBe("Fixture Climb");
    expect(parsed.trk[0].trkseg.trkpt).toEqual([
      { lat: 51.5, lon: -0.12, ele: 30 },
      { lat: 51.508993203637, lon: -0.12, ele: 30 },
      { lat: 51.517986407274, lon: -0.12, ele: 30 },
      { lat: 51.526979610912, lon: -0.12, ele: 180 },
      { lat: 51.535972814549, lon: -0.12, ele: 180 },
    ]);

    const course = await parseFile(new File([xml], "fixture-climb.gpx"));
    expect(course.name).toBe("Fixture Climb");
    expect(course.points).toHaveLength(5);
    expect(
      Number((course.points[course.points.length - 1].totalDistance / 1000).toFixed(2))
    ).toBe(4);
  });

  it("parses trimmed and fractional elevations on a multi-trkpt track", async () => {
    const xml = `<gpx><trk><name>Nums</name><trkseg><trkpt lat="1.0" lon="2"><ele>3.5</ele></trkpt><trkpt lat="4" lon="5"><ele> 9 </ele></trkpt></trkseg></trk></gpx>`;
    const parsed = await new GpxParser().parse(xml);
    expect(parsed.trk[0].trkseg.trkpt).toEqual([
      { lat: 1, lon: 2, ele: 3.5 },
      { lat: 4, lon: 5, ele: 9 },
    ]);
  });

  it("does not treat a prefixed xmlns attribute as a track", async () => {
    const xml = `<gpx xmlns:trk="urn:vendor"><trk><name>Namespaced</name><trkseg><trkpt lat="1" lon="2"><ele>3</ele></trkpt><trkpt lat="4" lon="5"><ele>6</ele></trkpt></trkseg></trk></gpx>`;
    const parsed = await new GpxParser().parse(xml);
    expect(parsed.trk).toHaveLength(1);
    expect(parsed.trk[0].name).toBe("Namespaced");
    expect(parsed.trk[0].trkseg.trkpt).toEqual([
      { lat: 1, lon: 2, ele: 3 },
      { lat: 4, lon: 5, ele: 6 },
    ]);
  });

  it("leaves a single trkpt as an object", async () => {
    const xml = `<gpx><trk><name>One</name><trkseg><trkpt lat="1.0" lon="2"><ele>3</ele></trkpt></trkseg></trk></gpx>`;
    const parsed = await new GpxParser().parse(xml);
    const trkpt: unknown = parsed.trk[0].trkseg.trkpt;
    expect(Array.isArray(trkpt)).toBe(false);
    expect(trkpt).toEqual({ lat: 1, lon: 2, ele: 3 });
  });

  it("returns no track when the GPX is not well-formed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = await new GpxParser().parse("<gpx>");
    expect(parsed.trk).toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("keeps markup in a course name as text", async () => {
    const xml = `<gpx><trk><name>&lt;b&gt;Hill&lt;/b&gt;</name><trkseg><trkpt lat="1" lon="2"><ele>3</ele></trkpt><trkpt lat="4" lon="5"><ele>6</ele></trkpt></trkseg></trk></gpx>`;
    const course = await parseFile(new File([xml], "markup.gpx"));
    expect(course.name).toBe("<b>Hill</b>");
  });

  it("does not treat a nested element in the name as a course title", async () => {
    const xml = `<gpx><trk><name><script>alert(1)</script></name><trkseg><trkpt lat="1" lon="2"><ele>3</ele></trkpt><trkpt lat="4" lon="5"><ele>6</ele></trkpt></trkseg></trk></gpx>`;
    const course = await parseFile(new File([xml], "nested.gpx"));
    expect(course.name).toBe("");
    expect(course.name.includes("<")).toBe(false);
  });
});
