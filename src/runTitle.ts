/** Header and document title for whatever course and playlist are loaded. */
export function formatRunTitle(
  courseName: string | null,
  playlistName: string | null
): string {
  const course = courseName?.trim() ?? "";
  const playlist = playlistName?.trim() ?? "";
  if (course && playlist) return `${course} - ${playlist}`;
  return course || playlist || "Runifly";
}

export function documentTitleForRun(runTitle: string): string {
  return runTitle === "Runifly" ? "Runifly" : `${runTitle} · Runifly`;
}
