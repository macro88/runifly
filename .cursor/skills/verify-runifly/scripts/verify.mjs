#!/usr/bin/env node
/**
 * Drive Runifly the way a user does and prove song timing.
 *
 * Exit 0 prints `verify-runifly: PASS`. Anything else prints
 * `verify-runifly: FAIL` and a non-zero status. Evidence files are kept.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const evidenceDir = path.join(
  root,
  ".cursor/skills/verify-runifly/evidence"
);
const gpxPath = path.join(root, "fixtures/fixture-climb.gpx");
const port = Number(process.env.VERIFY_PORT || 4173);
const pageUrl = `http://127.0.0.1:${port}/?fixtures=1`;

// Hand-checked against updateTimingData at 300 seconds per kilometre.
// Song durations are 180s, 240s, and 90.5s. Race times are cumulative
// seconds. Kilometres are the rounded race-time boundary divided by 300.
// Easy Descent's 510.5s is 1.7016… km, which toFixed(2) renders as 1.7.
// The song-time and race-time strings are formatTimeFromSeconds, which
// rounds leftover seconds (90.5s and 510.5s both end in :31).
const songs = [
  {
    name: "Warm Up",
    song: "3:00",
    km: "0 - 0.6",
    race: "0:00 - 3:00",
  },
  {
    name: "The Climb",
    song: "4:00",
    km: "0.6 - 1.4",
    race: "3:00 - 7:00",
  },
  {
    name: "Easy Descent",
    song: "1:31",
    km: "1.4 - 1.7",
    race: "7:00 - 8:31",
  },
];

const buildEnv = {
  ...process.env,
  VITE_REDIRECT_TARGET: `http://127.0.0.1:${port}/`,
};
delete buildEnv.VITE_SPOTIFY_CLIENT_ID;

function fail(message) {
  const error = new Error(message);
  error.verifyFailure = true;
  return error;
}

function run(title, command, args, env = process.env) {
  console.log(`\nverify-runifly: ${title}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(fail(`${title} failed with exit code ${code}`));
    });
  });
}

function childrenOf(pid) {
  const children = [];
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    let stat = "";
    try {
      stat = fs.readFileSync(`/proc/${entry}/stat`, "utf8");
    } catch {
      continue;
    }
    const commandEnd = stat.lastIndexOf(")");
    if (commandEnd === -1) continue;
    const fields = stat.slice(commandEnd + 2).split(" ");
    if (Number(fields[1]) === pid) children.push(Number(entry));
  }
  return children;
}

function processTree(pid) {
  const seen = new Set();
  const stack = [pid];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const child of childrenOf(current)) stack.push(child);
  }
  return seen;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listenInodes(listenPort) {
  const hexPort = listenPort.toString(16).toUpperCase().padStart(4, "0");
  const lines = fs.readFileSync("/proc/net/tcp", "utf8").split("\n").slice(1);
  const inodes = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) continue;
    const [address, hex] = parts[1].split(":");
    // 0A is LISTEN. 0100007F is 127.0.0.1, 00000000 is 0.0.0.0.
    if (hex.toUpperCase() !== hexPort || parts[3] !== "0A") continue;
    if (address !== "0100007F" && address !== "00000000") continue;
    inodes.push(parts[9]);
  }
  return inodes;
}

function pidsHoldingInodes(inodes) {
  const wanted = new Set(inodes);
  const pids = new Set();
  if (wanted.size === 0) return pids;
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    let fds;
    try {
      fds = fs.readdirSync(`/proc/${entry}/fd`);
    } catch {
      continue;
    }
    for (const fd of fds) {
      let link = "";
      try {
        link = fs.readlinkSync(`/proc/${entry}/fd/${fd}`);
      } catch {
        continue;
      }
      const match = /^socket:\[(\d+)\]$/.exec(link);
      if (match && wanted.has(match[1])) pids.add(Number(entry));
    }
  }
  return pids;
}

function listeningPids(listenPort) {
  const inodes = listenInodes(listenPort);
  const pids = pidsHoldingInodes(inodes);
  const out = `listen inodes: ${inodes.join(",") || "(none)"}`;
  return { out, pids };
}

async function stopProcessTree(pid) {
  if (!pid) return;
  const signal = (name) => {
    try {
      process.kill(-pid, name);
    } catch {
      // The process group is already gone. Fall through to the pid itself.
    }
    for (const id of [...processTree(pid)].reverse()) {
      try {
        process.kill(id, name);
      } catch {
        // Already gone.
      }
    }
  };
  signal("SIGTERM");
  const started = Date.now();
  while (Date.now() - started < 3000) {
    if (![...processTree(pid)].some(isAlive)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  signal("SIGKILL");
}

function startPreview(logPath) {
  const log = fs.openSync(logPath, "w");
  const child = spawn(
    "yarn",
    [
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: root,
      env: process.env,
      stdio: ["ignore", log, log],
      detached: true,
    }
  );
  return child;
}

async function waitForHttp(child) {
  const started = Date.now();
  let last = "no response yet";
  while (Date.now() - started < 20000) {
    if (child.exitCode !== null) {
      throw fail(
        `preview exited ${child.exitCode} before it was ready. See ${path.relative(root, path.join(evidenceDir, "preview.log"))}`
      );
    }
    try {
      const response = await fetch(pageUrl);
      if (response.status === 200) return response;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw fail(`preview was not ready within 20s (${last})`);
}

async function doctor(child) {
  console.log("\nverify-runifly: doctor");
  const response = await fetch(pageUrl);
  const body = await response.text();
  if (response.status !== 200) {
    throw fail(`doctor: expected HTTP 200, got ${response.status}`);
  }
  if (!body.includes('id="root"')) {
    throw fail("doctor: response has no #root");
  }
  const { pids, out } = listeningPids(port);
  const ours = processTree(child.pid);
  const owned = [...pids].filter((pid) => ours.has(pid));
  if (pids.size === 0 || owned.length === 0) {
    throw fail(
      `doctor: port ${port} is not owned by the preview we started\n${out}`
    );
  }
  console.log(`doctor: url ${pageUrl}`);
  console.log("doctor: http 200");
  console.log(
    `doctor: listener pid ${owned.join(",")} is in the preview process tree`
  );
}

function songRow(page, name) {
  // Sortable rows spread role="button" onto the <tr>, so getByRole("row")
  // does not see them. The <tr> is still the row a user is looking at.
  return page.locator("tr").filter({ hasText: name });
}

async function cellText(row) {
  return row.locator("td").evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
  );
}

async function setPace(page, minute = "05", second = "00") {
  const expected = `${minute}:${second}`;
  const pace = page.getByRole("textbox", { name: "Pace" });
  await pace.click();
  const panel = page.locator(
    ".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)"
  );
  await panel.waitFor({ state: "visible", timeout: 5000 });
  const columns = panel.locator(".ant-picker-time-panel-column");
  const count = await columns.count();
  if (count < 2) {
    throw fail(`pace picker opened ${count} columns, expected minutes and seconds`);
  }
  const minuteColumn = columns.nth(count - 2);
  const secondColumn = columns.nth(count - 1);
  await minuteColumn
    .locator(".ant-picker-time-panel-cell-inner", {
      hasText: new RegExp(`^${minute}$`),
    })
    .click();
  await secondColumn
    .locator(".ant-picker-time-panel-cell-inner", {
      hasText: new RegExp(`^${second}$`),
    })
    .click();
  await panel.locator(".ant-picker-ok button").click();
  const started = Date.now();
  let value = "";
  while (Date.now() - started < 5000) {
    value = await pace.inputValue();
    const open = await page
      .locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)")
      .count();
    if (value === expected && open === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (value === expected) {
    await page.keyboard.press("Escape");
    await page
      .locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)")
      .waitFor({ state: "hidden", timeout: 3000 })
      .catch(() => {});
    const after = await pace.inputValue();
    if (after === expected) return;
    throw fail(`pace field changed to "${after}" while closing the picker`);
  }
  throw fail(`pace field is "${value}", expected ${expected}`);
}

function coverageShot(name) {
  return path.join(evidenceDir, name);
}

async function shortfallLine(page) {
  const locator = page.getByText(
    /This playlist is about \d+ minutes? short of your run/
  );
  const text = await locator.textContent();
  return (text || "").replace(/\s+/g, " ").trim();
}

const SHORT_AT_FIVE =
  "This playlist is about 11 minutes short of your run. Music will stop early unless you add songs or shorten the course.";
const COVERAGE_INCOMPLETE =
  "Timing only holds if shuffle is off and crossfade matches what you enter below.";

async function assertShortfallThenCovered(page) {
  await page.getByText(SHORT_AT_FIVE).waitFor({ timeout: 5000 });
  await page.mouse.move(8, 8);
  await page.screenshot({ path: coverageShot("shortfall.png"), fullPage: true });
  console.log("coverage: shortfall 11 minutes");

  await setPace(page, "02", "00");
  await page.getByText(SHORT_AT_FIVE).waitFor({ state: "hidden", timeout: 5000 });
  await page.getByText(COVERAGE_INCOMPLETE).waitFor({ timeout: 5000 });
  await page.getByText("Before you run").waitFor();
  await page.getByText("Shuffle is off in Spotify").waitFor();
  await page
    .getByText(
      "Open Spotify → Settings → Playback → Crossfade. Enter the same number here (0 if crossfade is off)."
    )
    .waitFor();
  await page
    .getByText("Enter your Spotify crossfade, or 0 if it is off.")
    .waitFor();
  await page.mouse.move(8, 8);
  await page.screenshot({
    path: coverageShot("checklist-incomplete.png"),
    fullPage: true,
  });
  console.log("coverage: shortfall hidden, checklist incomplete");
}

async function assertChecklistReady(page) {
  await page.getByRole("checkbox", { name: "Shuffle is off in Spotify" }).check();
  const crossfade = page.getByRole("spinbutton", {
    name: "Crossfade in Spotify (seconds)",
  });
  await crossfade.fill("0");
  await page.getByText("Ready for the run").waitFor({ timeout: 5000 });
  await page.getByText(COVERAGE_INCOMPLETE).waitFor({ state: "hidden", timeout: 5000 });
  await page.getByText("Before you run").waitFor({ state: "hidden", timeout: 5000 });
  await page.mouse.move(8, 8);
  await page.screenshot({ path: coverageShot("ready.png"), fullPage: true });
  console.log("coverage: ready");

  const stored = await page.evaluate(() =>
    window.localStorage.getItem("runifly-spotify-crossfade-seconds")
  );
  if (stored !== "0") {
    throw fail(`crossfade storage was ${JSON.stringify(stored)}, expected "0"`);
  }
}

async function assertCrossfadeSurvivesReload(page) {
  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.getByText("Fixtures", { exact: true }).waitFor();
  if (!page.url().includes("fixtures=1")) {
    throw fail(`fixtures query was lost after reload: ${page.url()}`);
  }
  await page.getByRole("row").filter({ hasText: "Fixture Songs" }).click();
  const restored = page.getByRole("spinbutton", {
    name: "Crossfade in Spotify (seconds)",
  });
  await restored.waitFor({ timeout: 10000 });
  const started = Date.now();
  let value = "";
  while (Date.now() - started < 5000) {
    value = await restored.inputValue();
    if (value === "0") break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (value !== "0") {
    throw fail(`crossfade field is "${value}" after reload, expected 0`);
  }
  if (
    await page
      .getByRole("checkbox", { name: "Shuffle is off in Spotify" })
      .isChecked()
  ) {
    throw fail("shuffle stayed ticked after reload");
  }
  console.log("coverage: crossfade persisted");
}

async function assertShortfallRefreshes(page) {
  await page.getByLabel("Course GPX file").setInputFiles(gpxPath);
  await page.getByRole("heading", { level: 1, name: /Fixture Climb/ }).waitFor();
  const before = await shortfallLine(page);
  if (!before) throw fail("shortfall missing after reload");
  await setPace(page, "05", "00");
  const paceStarted = Date.now();
  let after = before;
  while (Date.now() - paceStarted < 5000) {
    after = await shortfallLine(page);
    if (after && after !== before) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!after || after === before) {
    throw fail(`shortfall did not refresh (still ${before})`);
  }
  console.log(`coverage: warning refreshed from "${before}" to "${after}"`);
}

async function assertPlaylistCoverage(page) {
  await assertShortfallThenCovered(page);
  await assertChecklistReady(page);
  await assertCrossfadeSurvivesReload(page);
  await assertShortfallRefreshes(page);
}

async function waitForSong(page, song) {
  const row = songRow(page, song.name);
  await row.first().waitFor({ timeout: 10000 });
  const started = Date.now();
  let cells = [];
  while (Date.now() - started < 10000) {
    cells = await cellText(row.first());
    if (
      cells.includes(song.song) &&
      cells.includes(song.km) &&
      cells.includes(song.race)
    ) {
      return cells;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw fail(
    `${song.name} cells were ${JSON.stringify(cells)}, expected song ${song.song}, km ${song.km}, race ${song.race}`
  );
}

async function assertSongBand(page, song, distanceKm) {
  const [from, to] = song.km.split(" - ").map(Number);
  await songRow(page, song.name).first().hover();
  const started = Date.now();
  let band = null;
  while (Date.now() - started < 5000) {
    band = await page.evaluate(() => {
      const svg = document.querySelector(".course-viewer svg");
      const rect = svg && svg.querySelector(".hoveredSongRect");
      const callout = svg && svg.querySelector(".hoveredCallout");
      if (!svg || !rect) return null;
      const width = Number(rect.getAttribute("width"));
      if (!(width > 1)) return null;
      const svgBox = svg.getBoundingClientRect();
      const rectBox = rect.getBoundingClientRect();
      const plot = svg.querySelector("g");
      const transform = plot ? plot.getAttribute("transform") || "" : "";
      const margin = /translate\(\s*([-\d.]+)/.exec(transform);
      return {
        svgWidth: svgBox.width,
        marginLeft: margin ? Number(margin[1]) : null,
        left: rectBox.left - svgBox.left,
        right: rectBox.right - svgBox.left,
        callout: (callout?.textContent || "").replace(/\s+/g, " ").trim(),
      };
    });
    if (band) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!band || band.marginLeft === null) {
    throw fail(`${song.name} band was not drawn on the chart`);
  }
  const plotWidth = band.svgWidth - band.marginLeft;
  const expectedLeft = band.marginLeft + (from / distanceKm) * plotWidth;
  const expectedRight = band.marginLeft + (to / distanceKm) * plotWidth;
  const slack = 1.5;
  if (
    Math.abs(band.left - expectedLeft) > slack ||
    Math.abs(band.right - expectedRight) > slack
  ) {
    throw fail(
      `${song.name} band edges were ${band.left.toFixed(1)}-${band.right.toFixed(1)} px, expected ${expectedLeft.toFixed(1)}-${expectedRight.toFixed(1)} for km ${from}-${to} on a ${distanceKm} km chart`
    );
  }
  if (!band.callout.includes(song.name)) {
    throw fail(`${song.name} callout was "${band.callout}"`);
  }
  console.log(
    `${song.name} band km ${from} - ${to} at ${band.left.toFixed(1)}-${band.right.toFixed(1)} px`
  );
}

async function drive(external, pageErrors) {
  console.log("\nverify-runifly: browser");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      env: { ...process.env, TZ: "UTC" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw fail(
      `Could not launch Chromium. Run \`yarn playwright install chromium\` and retry.\n${message}`
    );
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  try {
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  await page.route("**/*", (route) => {
    let host = "";
    try {
      host = new URL(route.request().url()).hostname;
    } catch {
      host = "";
    }
    if (host !== "127.0.0.1" && host !== "localhost") {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });

  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.getByText("Runifly", { exact: true }).first().waitFor();
  await page.getByText("Fixtures", { exact: true }).waitFor();
  if (!page.url().startsWith(`http://127.0.0.1:${port}/`)) {
    throw fail(`page left the origin: ${page.url()}`);
  }
  if (!page.url().includes("fixtures=1")) {
    throw fail(`fixtures query was lost: ${page.url()}`);
  }

  await page.getByRole("row").filter({ hasText: "Fixture Songs" }).click();
  await songRow(page, "Warm Up").waitFor();

  await page.getByLabel("Course GPX file").setInputFiles(gpxPath);
  await page.getByRole("heading", { level: 1, name: /Fixture Climb/ }).waitFor();

  const distance = page.getByRole("spinbutton", { name: "Distance (km)" });
  const distanceValue = await distance.inputValue();
  if (distanceValue !== "4") {
    throw fail(`distance field is "${distanceValue}", expected 4`);
  }

  await setPace(page);

  const rendered = [];
  for (const song of songs) {
    const cells = await waitForSong(page, song);
    rendered.push({ song, cells });
    console.log(
      `${song.name} | song ${song.song} | km ${song.km} | race ${song.race}`
    );
  }

  await page.keyboard.press("Escape");
  await page
    .locator(".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)")
    .waitFor({ state: "hidden", timeout: 3000 })
    .catch(() => {});
  const paceAfter = await page.getByRole("textbox", { name: "Pace" }).inputValue();
  if (paceAfter !== "05:00") {
    throw fail(`pace field changed to "${paceAfter}" while closing the picker`);
  }

  // Band edges use the same margin as ElevationGraph: the plot is shifted
  // right by translate(10, …) and the scale width is the svg width minus that.
  const distanceKm = Number(distanceValue);
  for (const song of songs) {
    await assertSongBand(page, song, distanceKm);
  }
  await page.mouse.move(8, 8);

  const shot = path.join(evidenceDir, "song-table.png");
  await page.screenshot({ path: shot, fullPage: true });
  const lines = [
    `url: ${page.url()}`,
    "course: Fixture Climb",
    `distanceKm: ${distanceValue}`,
    "pace: 05:00",
    `externalRequests: ${external.length}`,
    ...rendered.map(
      ({ song, cells }) => `${song.name}: ${cells.join(" | ")}`
    ),
  ];
  fs.writeFileSync(path.join(evidenceDir, "song-table.txt"), `${lines.join("\n")}\n`);
  console.log(`course: Fixture Climb`);
  console.log(`distanceKm: ${distanceValue}`);
  console.log("pace: 05:00");
  console.log(`externalRequests: ${external.length}`);
  console.log(`pageUrl: ${page.url()}`);

  await assertPlaylistCoverage(page);

  if (external.length) {
    throw fail(`external requests:\n${external.join("\n")}`);
  }
  if (!page.url().startsWith(`http://127.0.0.1:${port}/`)) {
    throw fail(`page left the origin after the journey: ${page.url()}`);
  }
  if (pageErrors.length) {
    throw fail(`page errors:\n${pageErrors.join("\n")}`);
  }
  } catch (error) {
    try {
      await page.screenshot({
        path: path.join(evidenceDir, "failure.png"),
        fullPage: true,
      });
    } catch {
      // The page may already be gone.
    }
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const failures = [];
  let preview = null;

  try {
    await run("unit tests", "yarn", ["test"]);
  } catch (error) {
    failures.push(error);
  }
  try {
    await run("lint", "yarn", ["lint"]);
  } catch (error) {
    failures.push(error);
  }
  let built = false;
  try {
    await run("build", "yarn", ["build"], buildEnv);
    built = true;
  } catch (error) {
    failures.push(error);
  }

  if (built) {
    try {
      const busy = listeningPids(port);
      if (busy.pids.size > 0) {
        throw fail(
          `port ${port} is already in use. Set VERIFY_PORT to a free port and run again.\n${busy.out}`
        );
      }
      console.log(`\nverify-runifly: launch ${pageUrl}`);
      preview = startPreview(path.join(evidenceDir, "preview.log"));
      await waitForHttp(preview);
      await doctor(preview);
      const external = [];
      const pageErrors = [];
      try {
        await drive(external, pageErrors);
      } finally {
        // drive closes the browser on success. On failure, close any leftover.
      }
    } catch (error) {
      failures.push(error);
    }
  }

  if (preview) {
    const previewPid = preview.pid;
    await stopProcessTree(previewPid);
    const still = listeningPids(port);
    const leaked = [...still.pids].filter((pid) => processTree(previewPid).has(pid));
    if (leaked.length) {
      failures.push(
        fail(
          `preview still listening on ${port} after cleanup (pid ${leaked.join(",")})`
        )
      );
    }
    preview = null;
  }

  const shot = path.join(evidenceDir, "song-table.png");
  if (fs.existsSync(shot)) {
    const size = fs.statSync(shot).size;
    console.log(
      `\nevidence: ${path.relative(root, shot)} (${size} bytes, still present after cleanup)`
    );
  } else if (failures.length === 0) {
    failures.push(fail("evidence screenshot is missing after cleanup"));
  }

  if (failures.length) {
    console.error("\nverify-runifly: FAIL");
    for (const error of failures) {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
    return;
  }
  console.log("\nverify-runifly: PASS");
}

main().catch((error) => {
  console.error("\nverify-runifly: FAIL");
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
