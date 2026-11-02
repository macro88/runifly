import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export type RaceDuration = ReturnType<typeof dayjs.duration>;

/**
 * The pace form used to seed its target with
 * `duration(paceSeconds * distanceKm * 1000)` and no unit, which dayjs reads
 * as milliseconds. Keep that construction so the settled 5:30/km pace matches.
 */
export function starterTargetTime(distanceKm: number): RaceDuration {
  const pace = dayjs.duration(5.5 * 60, "seconds");
  return dayjs.duration(pace.asSeconds() * distanceKm * 1000);
}

export function calculatePace(
  time: RaceDuration,
  distanceKm: number
): RaceDuration {
  return dayjs.duration(time.asSeconds() / distanceKm, "seconds");
}

export function calculateTargetTime(
  pace: RaceDuration,
  distanceKm: number
): RaceDuration {
  return dayjs.duration(pace.asSeconds() * distanceKm, "seconds");
}
