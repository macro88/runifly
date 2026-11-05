import type { RuniflySong } from "../hooks/useSpotifyPlaylist";
import { kilometresAtTime, type TimeDistanceCurve } from "./hillCurve";

/**
 * Pace is seconds per kilometre. Durations and race times are seconds.
 * Kilometres are the rounded race-time boundary divided by pace.
 * A hill curve replaces that division. Each boundary is rounded with
 * toFixed(2). The running total stays unrounded, so later songs do not
 * inherit that rounding.
 */
export function updateTimingData(
  songs: RuniflySong[],
  pace: number,
  curve?: TimeDistanceCurve | null
): RuniflySong[] {
  let cumlTime = 0;

  return songs.map((song) => {
    const raceTimeFrom = parseFloat(cumlTime.toFixed(2));
    const raceTimeTo = parseFloat((cumlTime + song.songDuration).toFixed(2));
    const lapFrom = parseFloat(kilometres(raceTimeFrom, pace, curve).toFixed(2));
    const lapTo = parseFloat(kilometres(raceTimeTo, pace, curve).toFixed(2));
    cumlTime += song.songDuration;

    return {
      ...song,
      raceTimeFrom,
      raceTimeTo,
      lapFrom,
      lapTo,
    };
  });
}

function kilometres(
  raceTimeSeconds: number,
  pace: number,
  curve?: TimeDistanceCurve | null
): number {
  if (!curve) return raceTimeSeconds / pace;
  return kilometresAtTime(curve, raceTimeSeconds);
}
