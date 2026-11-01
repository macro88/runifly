import type { RuniflySong } from "../hooks/useSpotifyPlaylist";

/**
 * Today's pace-to-song timing.
 *
 * Pace is seconds per kilometre. Durations and race times are seconds.
 * Kilometres are the rounded race-time boundary divided by pace.
 * Each boundary is rounded with toFixed(2). The running total stays
 * unrounded, so later songs do not inherit that rounding.
 */
export function updateTimingData(
  songs: RuniflySong[],
  pace: number
): RuniflySong[] {
  let cumlTime = 0;

  return songs.map((song) => {
    const raceTimeFrom = parseFloat(cumlTime.toFixed(2));
    const raceTimeTo = parseFloat((cumlTime + song.songDuration).toFixed(2));
    const lapFrom = parseFloat((raceTimeFrom / pace).toFixed(2));
    const lapTo = parseFloat((raceTimeTo / pace).toFixed(2));
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
