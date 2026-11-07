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

export type RunHeadingState = {
  runTitle: string;
  heading: string;
  showBrand: boolean;
  playlistSuffix: string | null;
  editable: boolean;
  editText: string;
  editFromIcon: boolean;
};

/** What the header shows. A generated route is not a loaded course. */
export function describeRunHeading(input: {
  courseFromFile: boolean;
  courseName: string;
  playlistKey: string | undefined;
  playlistName: string | undefined;
}): RunHeadingState {
  const playlist =
    input.playlistKey && input.playlistName?.trim() ? input.playlistName.trim() : null;
  const courseLabel =
    (input.courseFromFile || !playlist ? input.courseName : "").trim() || null;
  const runTitle = formatRunTitle(courseLabel, playlist);
  const editable = input.courseFromFile || courseLabel !== null;
  const heading = courseLabel ?? (input.courseFromFile ? "" : playlist ?? "Runifly");
  return {
    runTitle,
    heading,
    showBrand: runTitle !== "Runifly" || heading === "",
    playlistSuffix: (courseLabel || input.courseFromFile) && playlist ? playlist : null,
    editable,
    editText: courseLabel ?? "",
    editFromIcon: editable && courseLabel === null,
  };
}
