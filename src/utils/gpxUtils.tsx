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
  return length;
  //return Math.floor(length);
}

function radiansToLength(radians: number): number {
  const factor = earthRadiusMeters;

  return radians * factor;
}

export function calculateDistanceHaversine(
  point1: GeoJsonPoint,
  point2: GeoJsonPoint
): number {
  const [lon1, lat1, ele1] = point1;
  const [lon2, lat2, ele2] = point2;

  const earthRadius = 6371; // Radius of the Earth in kilometers

  // Convert latitude and longitude to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  // Calculate differences
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  // Calculate distance using Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;

  // Calculate elevation difference
  const eleDifference = (ele2 - ele1) / 1000;

  // Calculate total distance including elevation
  const totalDistance = Math.sqrt(
    distance * distance + eleDifference * eleDifference
  );

  return totalDistance;
}

function getPointDetails(points: GeoJsonPoint[]): PointDetail[] {
  const result: PointDetail[] = [];

  for (let i = 0; i < points.length; i++) {
    const [lon, lat, ele] = points[i];
    const distance = i > 0 ? calculateDistance(points[i - 1], points[i]) : 0;
    const totalDistance =
      i > 0 ? roundLength(result[i - 1].totalDistance + distance) : 0;
    const elevationGain = ele > points[i - 1]?.[2] ? ele - points[i - 1][2] : 0;
    const elevationLoss = ele < points[i - 1]?.[2] ? points[i - 1][2] - ele : 0;

    result.push({
      longitude: lon,
      latitude: lat,
      elevation: ele,
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

export function degreesDecimalToRadians(degrees: number): number {
  const radians = degrees % 360;
  return radians * (Math.PI / 180);
}

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export function calculateDistanceVincenty(
  point1: GeoJsonPoint,
  point2: GeoJsonPoint
) {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const a = 6378137; // Semi-major axis of the Earth
  const b = 6356752.3142; // Semi-minor axis of the Earth
  const f = 1 / 298.257223563; // Flattening of the Earth

  const L = toRadians(lon2 - lon1);
  const U1 = Math.atan((1 - f) * Math.tan(toRadians(lat1)));
  const U2 = Math.atan((1 - f) * Math.tan(toRadians(lat2)));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP;
  let iterLimit = 100;
  let sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM;

  do {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
          (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );

    if (sinSigma === 0) return 0; // Co-incident points

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha; // This line calculates cosSqAlpha
    cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  if (iterLimit === 0) return NaN; // Formula failed to converge
  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  const s = b * A * (sigma - deltaSigma); // The distance in meters

  // Calculate elevation difference
  //const eleDifference = ele2 - ele1;

  // Calculate total distance including elevation
  const totalDistance = Math.sqrt(s * s);

  return totalDistance / 1000; // Convert the distance to kilometers
}

export function createFakeGpx(
  name: string,
  distance: number,
  pace: number
): Gpx {
  const distanceInt = Math.floor(distance);
  const distanceFraction = distance - distanceInt;
  const amplitude = 10; // The height of the wave
  const frequency = 0.01; // The frequency of the wave

  const points: PointDetail[] = Array.from(
    { length: distanceInt },
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

  points[points.length - 1].elevation = 50;
  points[0].elevation = 50;

  if (distanceFraction > 0) {
    points[points.length - 1].distance = distanceFraction;
    points[points.length - 1].totalDistance += distanceFraction;
    points[points.length - 1].time += pace * distanceFraction;
  }

  const laps = aggregateLaps(points);

  return {
    name: name,
    points: points,
    laps,
  };
}

export function toTime(mins: number) {
  // Convert it to seconds
  let totalSeconds = mins * 60;

  // Calculate hours, minutes and seconds
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return { hours, minutes, seconds };
}

function smoothPoints(
  originalPoints: GeoJsonPoint[],
  percentileCutoff: number
) {
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
  console.log("Distance cutoff is", distanceCutoff, "km");

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
  // We remember to add on the last point
  smoothedPoints.push(originalPoints[originalPoints.length - 1]);
  console.log(
    `After smoothing: ${originalPoints.length} -> ${smoothedPoints.length}`
  );
  return smoothedPoints;
}

export async function parseFile(file: File): Promise<Gpx> {
  const parser: GpxParser = new GpxParser();

  const contents = await file.text();
  const gpx = await parser.parse(contents);
  //console.log(gpx);
  //console.log(parser.calculateTotalDistanceForPoints(gpx.trk[0].trkseg.trkpt));
  //console.log(parser.calculateElevationData(gpx.trk[0].trkseg.trkpt));

  const points = getPointDetails(
    smoothPoints(
      gpx.trk[0].trkseg.trkpt.map((p) => [p.lon, p.lat, p.ele]),
      gpx.trk[0].trkseg.trkpt.length > 3000
        ? Math.min(23, gpx.trk[0].trkseg.trkpt.length * 0.001)
        : 0
    )
  );

  const laps = aggregateLaps(points);

  const x = {
    name: gpx.trk[0].name,
    points,
    laps: laps,
  };
  //console.log(gpx);
  //console.log(parser.toStreamJSON(gpx.trk[0].trkseg.trkpt));
  //console.log(x);

  return x;
}

export function aggregateLaps(points: PointDetail[]): Lap[] {
  const laps: Lap[] = [];
  let currentLap = 1;
  let elevations: number[] = [];
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let time = 0;
  let lastElevation = 0;

  for (const point of points) {
    //store the last good elevation in case the current point has no elevation. Some files don't have elevation data for every point.
    if (point.elevation) lastElevation = point.elevation;

    totalDistance += point.distance;
    elevationGain += point.elevationGain;
    elevationLoss += point.elevationLoss;
    elevations.push(point.elevation ?? lastElevation);
    time += point.time;

    if (totalDistance >= 1000) {
      laps.push({
        lap: currentLap,
        totalDistance,
        elevationGain,
        elevationLoss,
        elevations: [...elevations],
        time,
      });

      currentLap++;
      totalDistance = 0;
      elevationGain = 0;
      elevationLoss = 0;
      elevations = [];
      time = 0;
    }
  }

  if (totalDistance > 0) {
    laps.push({
      lap: currentLap + totalDistance,
      totalDistance: 1 + totalDistance,
      elevationGain,
      elevationLoss,
      elevations: [...elevations],
      time,
    });
  }
  //console.log(laps);
  return laps;
}
