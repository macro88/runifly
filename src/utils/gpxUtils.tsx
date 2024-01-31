import GpxParser from "gpxparser";

export type GpxInfo = {
  name: string;
  distance: {
    total: number;
  };
  points: LatLonEle[];
  sizeBytes: number;
};

type LatLonBase = {
  lat: number;
  lon: number;
};

// Matches any type that has LatLonBase as a subset, plus elevation
export interface LatLonEle extends Required<LatLonBase> {
  ele: number;
}

export type GeoJsonPoint = [number, number, number];

export function toGeoJson(point: LatLonEle): GeoJsonPoint {
  return [point.lon, point.lat, point.ele];
}

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
  const eleDifference = ele2 - ele1;

  // Calculate total distance including elevation
  const totalDistance = Math.sqrt(
    distance * distance + eleDifference * eleDifference
  );

  return totalDistance;
}

export function getPointDetails(points: GeoJsonPoint[]): any[] {
  const result: any[] = [];

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

export default function parseGpxFile(gpxContents: string): GpxInfo {
  const gpx = new GpxParser();
  gpx.parse(gpxContents);

  const name = gpx.tracks[0].name;
  const points = gpx.tracks[0].points;

  const distance = {
    total: points.slice(1).reduce(
      (acc, cur, idx) => acc, //+ turf.distance(toGeoJson(cur), toGeoJson(points[idx])),
      0
    ),
  };
  // If any point does not have ele key, then add ele: 0
  for (const point of points) {
    if (point.ele == null) {
      point.ele = 0;
    }
  }

  const pointDetails = getPointDetails(points.map(toGeoJson));

  return {
    distance,
    points: pointDetails,
    name,
    sizeBytes: gpxContents.length,
  };
}
