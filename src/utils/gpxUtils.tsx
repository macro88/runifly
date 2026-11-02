import GpxParser from "./GpxParser";
export type GeoJsonPoint = [number, number, number];
export type Gpx = {
  name: string;
  points: PointDetail[];
  laps: Lap[];
};

export type PointDetail = {
  longitude: number;
  latitude: number;
  elevation: number;
  distance: number;
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  time: number;
};

export type Lap = {
  lap: number;
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  elevations: number[];
  time: number;
};

export const earthRadiusMeters = 6371008.8;

export function totalDistance(gpx: Gpx): number {
  return gpx.points[gpx.points.length - 1].totalDistance;
}

function calculateDistance(point1: GeoJsonPoint, point2: GeoJsonPoint): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const lat1R = degreesToRadians(lat1);
  const lat2R = degreesToRadians(lat2);

  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1R) * Math.cos(lat2R);

  return roundLength(
    radiansToLength(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
  );
}

function roundLength(length: number): number {
  return Math.round(length * 1000) / 1000;
}

function radiansToLength(radians: number): number {
  const factor = earthRadiusMeters;

  return radians * factor;
}

function getPointDetails(
  points: GeoJsonPoint[],
  carryTotal = 0,
  carryElevation = 0
): PointDetail[] {
  const result: PointDetail[] = [];

  for (let i = 0; i < points.length; i++) {
    const [lon, lat, rawElevation] = points[i];
    const distance = i > 0 ? calculateDistance(points[i - 1], points[i]) : 0;
    const previousTotal = i > 0 ? result[i - 1].totalDistance : carryTotal;
    const totalDistance = roundLength(previousTotal + distance);
    const previousElevation = i > 0 ? result[i - 1].elevation : carryElevation;
    const elevation = Number.isFinite(rawElevation) ? rawElevation : previousElevation;
    const baseline = i > 0 ? previousElevation : elevation;
    const elevationGain = elevation > baseline ? elevation - baseline : 0;
    const elevationLoss = elevation < baseline ? baseline - elevation : 0;

    result.push({
      longitude: lon,
      latitude: lat,
      elevation,
      distance,
      totalDistance,
      elevationGain,
      elevationLoss,
      time: 0,
    });
  }

  return result;
}

/**
 * Converts an angle in degrees to radians
 *
 * @name degreesToRadians
 * @param {number} degrees angle between 0 and 360 degrees
 * @returns {number} angle in radians
 */
export function degreesToRadians(degrees: number): number {
  const radians = degrees % 360;
  return (radians * Math.PI) / 180;
}

export function createFakeGpx(
  name: string,
  distance: number,
  pace: number
): Gpx {
  const wholeKilometres = Math.floor(distance);
  const fractionMeters = Math.round((distance - wholeKilometres) * 1000);
  const amplitude = 10; // The height of the wave
  const frequency = 0.01; // The frequency of the wave

  const points: PointDetail[] = Array.from(
    { length: wholeKilometres },
    (_, idx) => {
      const i = idx + 1;
      return {
        longitude: i,
        latitude: i,
        elevation:
          amplitude * Math.sin(frequency * i) + (Math.random() * 20 - 10) + 50,
        distance: 1000,
        totalDistance: i * 1000,
        elevationGain: 0,
        elevationLoss: 0,
        time: i * pace,
      };
    }
  );

  if (fractionMeters > 0) {
    const totalMeters = wholeKilometres * 1000 + fractionMeters;
    const i = points.length + 1;
    points.push({
      longitude: i,
      latitude: i,
      elevation: 50,
      distance: fractionMeters,
      totalDistance: totalMeters,
      elevationGain: 0,
      elevationLoss: 0,
      time: (totalMeters / 1000) * pace,
    });
  }

  if (points.length > 0) {
    points[0].elevation = 50;
    points[points.length - 1].elevation = 50;
  }

  return {
    name,
    points,
    laps: aggregateLaps(points),
  };
}

function smoothPoints(
  originalPoints: GeoJsonPoint[],
  percentileCutoff: number
) {
  if (originalPoints.length < 2) return originalPoints.slice();

  // Collect the distance from each point to the next point
  // length = originalPoints.length - 1
  const pairDistances = [];
  for (let i = 0; i < originalPoints.length - 1; i++) {
    pairDistances.push(
      calculateDistance(originalPoints[i], originalPoints[i + 1])
    );
  }
  pairDistances.sort();
  // Compute distance cutoff by multiplying the median distance by the given percentile
  // of course it's not really a "percentile" anymore, but good enough
  const distanceCutoff =
    percentileCutoff * pairDistances[Math.floor(pairDistances.length / 2)];

  // For smoothness, massage the gpx route by merging points below distance cutoff
  // the assumption here is that points are evenly spaced in time (maybe not always true?)
  const smoothedPoints = [originalPoints[0]];
  let idx = 1;
  while (idx < originalPoints.length - 1) {
    let summedDistance = 0;
    while (summedDistance < distanceCutoff && idx < originalPoints.length - 1) {
      summedDistance += calculateDistance(
        originalPoints[idx],
        originalPoints[idx + 1]
      );
      idx += 1;
    }
    smoothedPoints.push(originalPoints[idx]);
    idx += 1;
  }
  // The inner loop can already have landed on the last point.
  const lastPoint = originalPoints[originalPoints.length - 1];
  if (smoothedPoints[smoothedPoints.length - 1] !== lastPoint) {
    smoothedPoints.push(lastPoint);
  }
  return smoothedPoints;
}

type LoosePoint = { lat?: number; lon?: number; ele?: number };
type LooseSegment = { trkpt?: LoosePoint | LoosePoint[] };
type LooseTrack = { name?: unknown; trkseg?: LooseSegment | LooseSegment[] };
type LooseRoute = { name?: unknown; rtept?: LoosePoint | LoosePoint[] };

function asList<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function readName(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function coordsOf(points: LoosePoint | LoosePoint[] | undefined): GeoJsonPoint[] {
  const coords: GeoJsonPoint[] = [];
  for (const point of asList(points)) {
    if (point == null) continue;
    const latitude = point.lat;
    const longitude = point.lon;
    if (latitude == null || longitude == null) continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const rawElevation = point.ele;
    const elevation =
      rawElevation != null && Number.isFinite(rawElevation) ? rawElevation : Number.NaN;
    coords.push([longitude, latitude, elevation]);
  }
  return coords;
}

function chainsFromTracks(tracks: LooseTrack[]): { name: string; chains: GeoJsonPoint[][] } {
  const chains: GeoJsonPoint[][] = [];
  let name = "";
  for (const track of tracks) {
    if (!track) continue;
    if (!name) name = readName(track.name);
    for (const segment of asList(track.trkseg)) {
      const coords = coordsOf(segment?.trkpt);
      if (coords.length > 0) chains.push(coords);
    }
  }
  return { name, chains };
}

function chainsFromRoutes(routes: LooseRoute[]): { name: string; chains: GeoJsonPoint[][] } {
  const chains: GeoJsonPoint[][] = [];
  let name = "";
  for (const route of routes) {
    if (!route) continue;
    if (!name) name = readName(route.name);
    const coords = coordsOf(route.rtept);
    if (coords.length > 0) chains.push(coords);
  }
  return { name, chains };
}

function pointsFromChains(chains: GeoJsonPoint[][]): PointDetail[] {
  const points: PointDetail[] = [];
  for (const chain of chains) {
    const cutoff =
      chain.length > 3000 ? Math.min(23, chain.length * 0.001) : 0;
    const smoothed = smoothPoints(chain, cutoff);
    const previous = points[points.length - 1];
    // A new segment or track is a break in the recording. The gap is not distance.
    points.push(
      ...getPointDetails(
        smoothed,
        previous?.totalDistance ?? 0,
        previous?.elevation ?? 0
      )
    );
  }
  return points;
}

export async function parseFile(file: File): Promise<Gpx> {
  const parser: GpxParser = new GpxParser();
  const contents = await file.text();
  const gpx = (await parser.parse(contents)) as {
    trk?: LooseTrack | LooseTrack[];
    rte?: LooseRoute | LooseRoute[];
  };

  const tracks = chainsFromTracks(asList(gpx.trk));
  const geometry =
    tracks.chains.length > 0 ? tracks : chainsFromRoutes(asList(gpx.rte));
  if (geometry.chains.length === 0) {
    throw new Error("Invalid GPX");
  }

  const points = pointsFromChains(geometry.chains);
  if (points.length === 0 || points[points.length - 1].totalDistance <= 0) {
    throw new Error("Invalid GPX");
  }
  return {
    name: geometry.name,
    points,
    laps: aggregateLaps(points),
  };
}

const MILLIMETRES_PER_METRE = 1000;
const MILLIMETRES_PER_LAP = 1000 * MILLIMETRES_PER_METRE;

function metresToMillimetres(metres: number): number {
  return Math.round(metres * MILLIMETRES_PER_METRE);
}

export function aggregateLaps(points: PointDetail[]): Lap[] {
  const laps: Lap[] = [];
  let lapNumber = 1;
  let elevations: number[] = [];
  let lapMillimetres = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let time = 0;

  const closeLap = (millimetres: number) => {
    laps.push({
      lap: lapNumber,
      totalDistance: millimetres / MILLIMETRES_PER_METRE,
      elevationGain,
      elevationLoss,
      elevations: [...elevations],
      time,
    });
    lapNumber += 1;
    elevations = [];
    elevationGain = 0;
    elevationLoss = 0;
    time = 0;
    lapMillimetres = 0;
  };

  for (const point of points) {
    const elevation = Number.isFinite(point.elevation) ? point.elevation : 0;
    elevations.push(elevation);
    elevationGain += point.elevationGain;
    elevationLoss += point.elevationLoss;
    time += point.time;

    let remainingMillimetres = metresToMillimetres(point.distance);
    while (lapMillimetres + remainingMillimetres >= MILLIMETRES_PER_LAP) {
      const needed = MILLIMETRES_PER_LAP - lapMillimetres;
      if (!(needed > 0)) break;
      remainingMillimetres -= needed;
      closeLap(MILLIMETRES_PER_LAP);
      if (remainingMillimetres > 0) elevations.push(elevation);
    }
    lapMillimetres += remainingMillimetres;
  }

  if (lapMillimetres > 0) closeLap(lapMillimetres);
  return laps;
}
