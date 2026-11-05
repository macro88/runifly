/**
 * Time along a course when climbs cost extra seconds and descents do not
 * give any back. A race time is read off that curve as kilometres.
 * Climb cost 0 is the flat pace: kilometres = seconds / pace.
 */

export const DEFAULT_CLIMB_COST_SECONDS_PER_METRE = 6;
export const MAX_CLIMB_COST_SECONDS_PER_METRE = 20;

export const CLIMB_COST_STORAGE_KEY = "runifly-climb-cost-seconds-per-metre";
export const HILL_ADJUST_STORAGE_KEY = "runifly-adjust-for-hills";

export type CourseElevation = "missing" | "flat" | "usable";

export type HillSample = {
  distanceMetres: number;
  elevationGainMetres: number;
};

export type TimeDistanceVertex = {
  timeSeconds: number;
  distanceKilometres: number;
  /** Climb seconds paid by the time this vertex is reached. Flat prefixes stay 0. */
  cumulativeClimbSeconds: number;
};

export type TimeDistanceCurve = {
  vertices: readonly TimeDistanceVertex[];
  totalTimeSeconds: number;
  totalDistanceKilometres: number;
  totalElevationGainMetres: number;
  climbCostSeconds: number;
  paceSecondsPerKilometre: number;
};

type ElevationPoint = {
  elevation: number;
  elevationGain: number;
};

type DistancePoint = ElevationPoint & {
  distance: number;
};

export function classifyCourseElevation(
  points: readonly ElevationPoint[]
): CourseElevation {
  let finiteSamples = 0;
  let nonZeroSamples = 0;
  let gainMetres = 0;

  for (const point of points) {
    if (!Number.isFinite(point.elevation)) continue;
    finiteSamples += 1;
    if (point.elevation !== 0) nonZeroSamples += 1;
    if (point.elevationGain > 0) gainMetres += point.elevationGain;
  }

  if (finiteSamples === 0 || nonZeroSamples === 0) return "missing";
  if (!(gainMetres > 0)) return "flat";
  return "usable";
}

/** Stored choice wins. With no choice, a course that actually climbs starts on. */
export function effectiveHillAdjust(
  preference: boolean | null,
  elevation: CourseElevation
): boolean {
  if (elevation === "missing") return false;
  if (preference === null) return elevation === "usable";
  return preference;
}

export function parseClimbCost(raw: string | null): number {
  if (raw === null || !/^(?:0|[1-9]\d*)$/.test(raw)) {
    return DEFAULT_CLIMB_COST_SECONDS_PER_METRE;
  }
  const value = Number(raw);
  if (value > MAX_CLIMB_COST_SECONDS_PER_METRE) {
    return DEFAULT_CLIMB_COST_SECONDS_PER_METRE;
  }
  return value;
}

export function parseHillAdjust(raw: string | null): boolean | null {
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

export function clampClimbCost(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CLIMB_COST_SECONDS_PER_METRE;
  return Math.min(
    MAX_CLIMB_COST_SECONDS_PER_METRE,
    Math.max(0, Math.round(value))
  );
}

export function samplesFromPoints(points: readonly DistancePoint[]): HillSample[] {
  const samples: HillSample[] = [];
  for (const point of points) {
    const distanceMetres = point.distance > 0 ? point.distance : 0;
    const elevationGainMetres = point.elevationGain > 0 ? point.elevationGain : 0;
    if (distanceMetres === 0 && elevationGainMetres === 0) continue;
    samples.push({ distanceMetres, elevationGainMetres });
  }
  return samples;
}

export function buildTimeDistanceCurve(
  samples: readonly HillSample[],
  paceSecondsPerKilometre: number,
  climbCostSecondsPerMetre: number
): TimeDistanceCurve {
  const cost = climbCostSecondsPerMetre > 0 ? climbCostSecondsPerMetre : 0;
  const vertices: TimeDistanceVertex[] = [
    { timeSeconds: 0, distanceKilometres: 0, cumulativeClimbSeconds: 0 },
  ];
  let timeSeconds = 0;
  let distanceKilometres = 0;
  let totalElevationGainMetres = 0;
  let climbSeconds = 0;

  for (const sample of samples) {
    const distanceKm = sample.distanceMetres / 1000;
    const gain = sample.elevationGainMetres > 0 ? sample.elevationGainMetres : 0;
    const segmentClimbSeconds = gain * cost;
    timeSeconds += distanceKm * paceSecondsPerKilometre + segmentClimbSeconds;
    distanceKilometres += distanceKm;
    totalElevationGainMetres += gain;
    climbSeconds += segmentClimbSeconds;
    vertices.push({
      timeSeconds,
      distanceKilometres,
      cumulativeClimbSeconds: climbSeconds,
    });
  }

  return {
    vertices,
    totalTimeSeconds: timeSeconds,
    totalDistanceKilometres: distanceKilometres,
    totalElevationGainMetres,
    climbCostSeconds: climbSeconds,
    paceSecondsPerKilometre,
  };
}

/**
 * Kilometres reached at a race time. Before any climb is paid this is
 * time / pace, the same division as flat placement.
 */
export function kilometresAtTime(
  curve: TimeDistanceCurve,
  timeSeconds: number
): number {
  const pace = curve.paceSecondsPerKilometre;
  if (!(timeSeconds > 0) || !(pace > 0)) return 0;
  if (!(curve.climbCostSeconds > 0)) return timeSeconds / pace;

  for (let index = 1; index < curve.vertices.length; index += 1) {
    const end = curve.vertices[index];
    if (timeSeconds > end.timeSeconds) continue;
    if (end.cumulativeClimbSeconds === 0) return timeSeconds / pace;
    const start = curve.vertices[index - 1];
    const span = end.timeSeconds - start.timeSeconds;
    if (!(span > 0)) return end.distanceKilometres;
    const fraction = (timeSeconds - start.timeSeconds) / span;
    return (
      start.distanceKilometres +
      fraction * (end.distanceKilometres - start.distanceKilometres)
    );
  }

  const last = curve.vertices[curve.vertices.length - 1];
  if (!last) return timeSeconds / pace;
  return last.distanceKilometres + (timeSeconds - last.timeSeconds) / pace;
}

/** Null keeps today's flat placement: toggle off, cost 0, or no recorded gain. */
export function timingCurveForCourse(
  points: readonly DistancePoint[],
  paceSecondsPerKilometre: number,
  climbCostSecondsPerMetre: number,
  adjustForHills: boolean
): TimeDistanceCurve | null {
  if (!adjustForHills || !(climbCostSecondsPerMetre > 0)) return null;
  const samples = samplesFromPoints(points);
  let gain = 0;
  for (const sample of samples) gain += sample.elevationGainMetres;
  if (!(gain > 0)) return null;
  return buildTimeDistanceCurve(
    samples,
    paceSecondsPerKilometre,
    climbCostSecondsPerMetre
  );
}
