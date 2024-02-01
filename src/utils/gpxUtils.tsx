import GpxParser from "gpx-parser-ts";

export type GeoJsonPoint = [number, number, number];
export type Gpx = {
  name: string;
  points: PointDetail[];
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

function calculateDistance(point1: GeoJsonPoint, point2: GeoJsonPoint): number {
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
    const totalDistance = i > 0 ? result[i - 1].totalDistance + distance : 0;
    const elevationGain = ele > points[i - 1]?.[2] ? ele - points[i - 1][2] : 0;
    const elevationLoss = ele < points[i - 1]?.[2] ? points[i - 1][2] - ele : 0;

    result.push({
      lon,
      lat,
      ele,
      distance,
      totalDistance,
      elevationGain,
      elevationLoss,
    });
  }

  return result;
}

export function createFakeGpx(
  name: string,
  distance: number,
  pace: number
): Gpx {
  const distanceInt = Math.floor(distance);
  const distanceFraction = distance - distanceInt;

  const points: PointDetail[] = Array.from(
    { length: distanceInt },
    (_, idx) => {
      const i = idx + 1;
      return {
        longitude: i,
        latitude: i,
        elevation: i,
        distance: i,
        totalDistance: i,
        elevationGain: i,
        elevationLoss: i,
        time: i * pace,
      };
    }
  );

  if (distanceFraction > 0) {
    points[points.length - 1].distance += distanceFraction;
    points[points.length - 1].time += pace * distanceFraction;
  }

  return {
    name: name,
    points: points,
  };
}

function toTime(mins: number) {
  // Convert it to seconds
  let totalSeconds = mins * 60;

  // Calculate hours, minutes and seconds
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return { hours, minutes, seconds };
}

export async function parseFile(file: File): any {
  const parser: GpxParser = new GpxParser();

  const contents = await file.text();
  let gpx = await parser.parse(contents);
  console.log(gpx);
  console.log(parser.calculateTotalDistanceForPoints(gpx.trk[0].trkseg.trkpt));
  console.log(parser.calculateElevationData(gpx.trk[0].trkseg.trkpt));

  const x = getPointDetails(
    gpx.trk[0].trkseg.trkpt.map((p) => [p.lon, p.lat, p.ele])
  );
  return x;
}
