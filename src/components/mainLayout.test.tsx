// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import fs from "node:fs";
import path from "node:path";
import { documentTitleForRun, formatRunTitle } from "../runTitle";

const HILL_HINT =
  "Climbs add time, so later songs stay on the map. Descents keep your flat pace.";
const COST_HINT =
  "Default 6 (about Naismith). Raise it if you hike the hills; set 0 for flat timing.";
const CROSSFADE_HINT =
  "Open Spotify → Settings → Playback → Crossfade. Enter the same number here (0 if crossfade is off).";

function installBrowserShims() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
  if (!("ResizeObserver" in window)) {
    class ResizeObserverShim {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: ResizeObserverShim,
    });
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
}

installBrowserShims();

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function header(): HTMLElement {
  const found = document.querySelector(".ant-layout-header");
  if (!(found instanceof HTMLElement)) throw new Error("missing header");
  return found;
}

function heading(): HTMLElement {
  const found = header().querySelector("h1");
  if (!(found instanceof HTMLElement)) throw new Error("missing heading");
  return found;
}

function hills(): HTMLElement {
  const found = document.querySelector('[aria-label="Hills"]');
  if (!(found instanceof HTMLElement)) throw new Error("missing hills");
  return found;
}

function buttonMatching(pattern: RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((button) =>
    pattern.test(button.textContent ?? "") ||
    pattern.test(button.getAttribute("aria-label") ?? "")
  );
  if (!(found instanceof HTMLButtonElement)) {
    throw new Error(`missing button ${pattern}`);
  }
  return found;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

async function waitFor(label: string, ready: () => boolean) {
  const started = Date.now();
  while (Date.now() - started < 2000) {
    if (ready()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function mount(href: string) {
  window.location.href = href;
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.title = "";
  const { default: App } = await import("../App.tsx");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
  });
}

async function unmount() {
  const current = root;
  root = null;
  if (current) {
    await act(async () => {
      current.unmount();
    });
  }
  container?.remove();
  container = null;
}

async function chooseFixturePlaylist() {
  const row = [...document.querySelectorAll("tr")].find((candidate) =>
    candidate.textContent?.includes("Fixture Songs")
  );
  if (!(row instanceof HTMLElement)) throw new Error("missing Fixture Songs");
  await click(row);
  await waitFor(
    "playlist title",
    () => heading().textContent?.includes("Fixture Songs") ?? false
  );
}

async function loadFixtureClimb() {
  const xml = fs.readFileSync(
    path.resolve("fixtures/fixture-climb.gpx"),
    "utf8"
  );
  const input = document.querySelector('[aria-label="Course GPX file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("missing gpx input");
  const file = new File([xml], "fixture-climb.gpx", {
    type: "application/gpx+xml",
  });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await waitFor(
    "course heading",
    () => heading().textContent?.includes("Fixture Climb") ?? false
  );
}

describe("formatRunTitle", () => {
  it("joins a course and a playlist, and falls back when either is missing", () => {
    expect(formatRunTitle("Shanghai Marathon", "Mara Run Playlist")).toBe(
      "Shanghai Marathon - Mara Run Playlist"
    );
    expect(formatRunTitle("Shanghai Marathon", null)).toBe("Shanghai Marathon");
    expect(formatRunTitle(null, "Mara Run Playlist")).toBe("Mara Run Playlist");
    expect(formatRunTitle(null, null)).toBe("Runifly");
    expect(formatRunTitle("  ", "  ")).toBe("Runifly");
    expect(documentTitleForRun("Runifly")).toBe("Runifly");
    expect(documentTitleForRun("Shanghai Marathon - Mara Run Playlist")).toBe(
      "Shanghai Marathon - Mara Run Playlist · Runifly"
    );
  });
});

describe("main screen layout", () => {
  afterEach(async () => {
    await unmount();
  });

  it("names the header from the loaded course and playlist", async () => {
    await mount("http://127.0.0.1:5173/?fixtures=1");

    expect(heading().textContent).toContain("Runifly");
    expect(document.title).toBe("Runifly");
    expect(header().textContent).toContain("Fixtures");

    await chooseFixturePlaylist();
    expect(heading().textContent).toContain("Fixture Songs");
    expect(header().textContent).toContain("Runifly");
    expect(document.title).toBe("Fixture Songs · Runifly");

    await loadFixtureClimb();
    expect(heading().textContent).toContain("Fixture Climb");
    expect(header().textContent).toContain("Fixture Climb - Fixture Songs");
    expect(document.title).toBe("Fixture Climb - Fixture Songs · Runifly");
  });

  it("keeps the playlist in the header when the GPX has no track name", async () => {
    await mount("http://127.0.0.1:5173/?fixtures=1");
    await chooseFixturePlaylist();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="runifly-fixtures" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <trkseg>
      <trkpt lat="51.500000000000" lon="-0.120000000000"><ele>30</ele></trkpt>
      <trkpt lat="51.508993203637" lon="-0.120000000000"><ele>30</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
    const input = document.querySelector('[aria-label="Course GPX file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("missing gpx input");
    const file = new File([xml], "unnamed.gpx", { type: "application/gpx+xml" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitFor("unnamed course distance", () => {
      const distance = document.querySelector('[aria-label="Distance (km)"]');
      return (
        distance instanceof HTMLInputElement &&
        distance.value !== "" &&
        distance.value !== "42.196"
      );
    });

    expect(heading().textContent).toContain("Fixture Songs");
    expect(heading().textContent).not.toContain("Runifly");
    expect(header().textContent).not.toContain(" - ");
  });

  it("keeps the playlist warning on one line until it is opened", async () => {
    await mount("http://127.0.0.1:5173/?fixtures=1");
    await chooseFixturePlaylist();

    await waitFor(
      "shortfall summary",
      () =>
        [...document.querySelectorAll("button")].some((button) =>
          /min short/.test(button.textContent ?? "")
        )
    );
    const summary = buttonMatching(/min short/);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(summary.textContent).toMatch(/~\d+ min short/);
    expect(document.body.textContent).not.toContain(CROSSFADE_HINT);
    expect(document.body.textContent).not.toContain("Before you run");

    const crossfade = document.querySelector(
      '[aria-label="Crossfade in Spotify (seconds)"]'
    );
    if (!(crossfade instanceof HTMLElement)) throw new Error("missing crossfade");
    expect(crossfade.getAttribute("aria-invalid")).toBe("true");
    expect(document.body.textContent).toContain("Required");

    await click(summary);
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.textContent).toContain(CROSSFADE_HINT);
    expect(document.body.textContent).toContain("Before you run");
    expect(document.body.textContent).toContain(
      "This playlist is about"
    );

    await click(summary);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.textContent).not.toContain(CROSSFADE_HINT);
    expect(document.body.textContent).toContain("Required");
    expect(
      document.querySelector('[aria-label="Crossfade in Spotify (seconds)"]')
    ).not.toBeNull();
  });

  it("does not put hill notes in the row when adjust for hills is turned on", async () => {
    await mount("http://127.0.0.1:5173/?fixtures=1");

    expect(hills().textContent).toContain("Adjust for hills");
    expect(document.body.textContent).not.toContain(HILL_HINT);
    expect(
      document.querySelector('[aria-label="Climb cost (seconds per metre)"]')
    ).toBeNull();

    const hill = document.querySelector('[role="switch"][aria-label="Adjust for hills"]');
    if (!(hill instanceof HTMLElement)) throw new Error("missing hill switch");
    await click(hill);

    expect(
      document.querySelector('[aria-label="Climb cost (seconds per metre)"]')
    ).not.toBeNull();
    const hillRow = hills().firstElementChild;
    if (!(hillRow instanceof HTMLElement)) throw new Error("missing hill row");
    expect(hillRow.textContent).not.toContain(HILL_HINT);
    expect(hillRow.textContent).not.toContain(COST_HINT);
    expect(document.body.textContent).not.toContain(HILL_HINT);

    await click(buttonMatching(/^Hill timing notes$/));
    await waitFor("hill notes", () => document.body.textContent?.includes(HILL_HINT) ?? false);
    expect(document.body.textContent).toContain(COST_HINT);
    expect(hillRow.textContent).not.toContain(HILL_HINT);
    expect(hillRow.textContent).not.toContain(COST_HINT);
  });
});
