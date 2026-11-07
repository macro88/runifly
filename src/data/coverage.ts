export type PlaylistCoverage = {
  musicSeconds: number;
  runSeconds: number;
  shortfallSeconds: number;
  short: boolean;
};

/**
 * Music is the songs in their current order. Crossfade overlaps consecutive
 * tracks, so it comes off once per gap and never for the first track.
 * The caller passes the run length used for song timing (pace × distance).
 */
export function playlistCoverage(input: {
  durationsSeconds: readonly number[];
  runSeconds: number;
  crossfadeSeconds: number;
}): PlaylistCoverage {
  const overlapCount = Math.max(0, input.durationsSeconds.length - 1);
  const fadeSeconds = input.crossfadeSeconds > 0 ? input.crossfadeSeconds : 0;
  const summed = input.durationsSeconds.reduce(
    (total, seconds) => total + seconds,
    0
  );
  const musicSeconds = Math.max(0, summed - fadeSeconds * overlapCount);
  const shortfallSeconds = Math.max(0, input.runSeconds - musicSeconds);

  return {
    musicSeconds,
    runSeconds: input.runSeconds,
    shortfallSeconds,
    short: musicSeconds < input.runSeconds,
  };
}

/** Nearest minute, and at least one minute whenever the playlist is short. */
export function shortfallMinuteCount(shortfallSeconds: number): number {
  if (shortfallSeconds <= 0) return 0;
  return Math.max(1, Math.round(shortfallSeconds / 60));
}

export function shortfallWarning(shortfallSeconds: number): string {
  const minutes = shortfallMinuteCount(shortfallSeconds);
  const unit = minutes === 1 ? "minute" : "minutes";
  return `This playlist is about ${minutes} ${unit} short of your run. Music will stop early unless you add songs or shorten the course.`;
}

/** One-line fact for the collapsed playlist warning. */
export function shortfallSummary(shortfallSeconds: number): string {
  return `~${shortfallMinuteCount(shortfallSeconds)} min short`;
}
