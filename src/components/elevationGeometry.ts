type DistancePoint = {
  totalDistance: number;
  elevation: number;
};

export type ElevationSample = {
  kilometre: number;
  elevation: number;
};

export function courseKilometres(points: { totalDistance: number }[]): number {
  const last = points[points.length - 1];
  if (!last) return 0;
  return last.totalDistance / 1000;
}

export function elevationSamples(points: DistancePoint[]): ElevationSample[] {
  return points.map((point) => ({
    kilometre: point.totalDistance / 1000,
    elevation: point.elevation,
  }));
}

// Linear map from kilometres onto the plot width. A 0.6 km remainder on a
// 1.6 km route is 0.6/1.6 of the width.
export function kilometreX(
  kilometre: number,
  routeKilometres: number,
  width: number
): number {
  if (!(routeKilometres > 0)) return 0;
  return (kilometre / routeKilometres) * width;
}
