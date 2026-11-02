#!/usr/bin/env node
// The Pages publish writes shields.io endpoint JSON into dist/badges.
// yarn doctor passes --no-score, and doctor.config.json sets noScore, so that
// report's summary.score stays null. react-doctor 0.9.x does not compute a
// local score. diagnose() is the installed tool's score path: it POSTs to
// https://www.react.doctor/api/score and returns that number. A missing
// number falls back to the error and warning counts from yarn doctor.

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diagnose } from "react-doctor/api";

const ANSI = /\u001b\[[0-9;]*m/g;
const AISLOP_SCORE = /(\d{1,3})\s+\/\s+100\b/g;
const DOCTOR_CATEGORY = /^([A-Z][A-Za-z]+(?: [A-Za-z]+)*):\s+(.+)$/;
const COUNT_CLAUSE = /(\d+)\s+(errors?|warnings?)/g;

export function stripAnsi(text) {
  return text.replace(ANSI, "");
}

export function colorForScore(score) {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  return "red";
}

export function parseAislopScore(text) {
  const matches = [...stripAnsi(text).matchAll(AISLOP_SCORE)];
  if (matches.length === 0) return null;
  const score = Number(matches[matches.length - 1][1]);
  if (!Number.isInteger(score) || score > 100) return null;
  return score;
}

function clauseCounts(clause) {
  let errors = 0;
  let warnings = 0;
  let saw = false;
  for (const match of clause.matchAll(COUNT_CLAUSE)) {
    saw = true;
    const count = Number(match[1]);
    if (match[2].startsWith("error")) errors += count;
    else warnings += count;
  }
  return saw ? { errors, warnings } : null;
}

export function parseDoctorCounts(text) {
  const plain = stripAnsi(text);
  const fromJson = parseDoctorJson(plain);
  if (fromJson) return fromJson;
  let errors = 0;
  let warnings = 0;
  let saw = false;
  for (const line of plain.split("\n")) {
    const match = DOCTOR_CATEGORY.exec(line.trim());
    if (!match) continue;
    const counts = clauseCounts(match[2]);
    if (!counts) continue;
    saw = true;
    errors += counts.errors;
    warnings += counts.warnings;
  }
  if (!saw) return null;
  return { score: null, errorCount: errors, warningCount: warnings };
}

function parseDoctorJson(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const summary = data && data.summary;
  if (!summary || typeof summary.errorCount !== "number") return null;
  if (typeof summary.warningCount !== "number") return null;
  const score = typeof summary.score === "number" ? summary.score : null;
  return {
    score: score !== null && score >= 0 && score <= 100 ? score : null,
    errorCount: summary.errorCount,
    warningCount: summary.warningCount,
  };
}

export function countMessage(errorCount, warningCount) {
  const errors = errorCount === 1 ? "1 error" : `${errorCount} errors`;
  const warnings = warningCount === 1 ? "1 warning" : `${warningCount} warnings`;
  return `${errors}, ${warnings}`;
}

export function shieldsEndpoint(label, message, color) {
  return {
    schemaVersion: 1,
    label,
    message,
    color,
    cacheSeconds: 300,
  };
}

export function aislopBadge(score) {
  if (typeof score !== "number") {
    return shieldsEndpoint("aislop", "unavailable", "lightgrey");
  }
  return shieldsEndpoint("aislop", `${score}/100`, colorForScore(score));
}

export function reactDoctorBadge(score, counts) {
  if (typeof score === "number" && score >= 0 && score <= 100) {
    return shieldsEndpoint("react-doctor", `${score}/100`, colorForScore(score));
  }
  if (counts) {
    return shieldsEndpoint(
      "react-doctor",
      countMessage(counts.errorCount, counts.warningCount),
      "blue",
    );
  }
  return shieldsEndpoint("react-doctor", "unavailable", "lightgrey");
}

async function hasPackageJson(dir) {
  try {
    await readFile(path.join(dir, "package.json"), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function repoRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (await hasPackageJson(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(process.cwd());
    dir = parent;
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, text: `${stdout}\n${stderr}` });
    });
  });
}

async function readOutput(filePath, cwd) {
  return readFile(path.resolve(cwd, filePath), "utf8");
}

function finiteScore(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  return score;
}

async function scoreFromApi(root) {
  const result = await diagnose(root);
  const score = finiteScore(result.score?.score);
  let errors = 0;
  let warnings = 0;
  for (const diagnostic of result.diagnostics) {
    if (diagnostic.severity === "error") errors += 1;
    else if (diagnostic.severity === "warning") warnings += 1;
  }
  return {
    score,
    counts: { errorCount: errors, warningCount: warnings },
  };
}

function parseArgs(argv) {
  const options = {
    out: "dist/badges",
    aislopOutput: null,
    doctorOutput: null,
    skipApi: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") options.out = argv[index + 1];
    else if (arg === "--aislop-output") options.aislopOutput = argv[index + 1];
    else if (arg === "--doctor-output") options.doctorOutput = argv[index + 1];
    else if (arg === "--skip-api") options.skipApi = true;
    else continue;
    if (arg !== "--skip-api") index += 1;
  }
  return options;
}

async function loadToolText(options, root) {
  const aislopText = options.aislopOutput
    ? await readOutput(options.aislopOutput, root)
    : (await runCommand("yarn", ["aislop"], root)).text;
  const doctorText = options.doctorOutput
    ? await readOutput(options.doctorOutput, root)
    : (await runCommand("yarn", ["doctor"], root)).text;
  return { aislopText, doctorText };
}

async function reactDoctorScore(root, doctorText, skipApi) {
  const parsed = parseDoctorCounts(doctorText);
  const parsedScore = finiteScore(parsed?.score);
  if (parsedScore !== null) {
    return { score: parsedScore, counts: parsed };
  }
  if (!skipApi) {
    try {
      const api = await scoreFromApi(root);
      if (api.score !== null) return api;
      if (parsed) return { score: null, counts: parsed };
      return { score: null, counts: api.counts };
    } catch {
      // The report counts are still an honest badge when the API is down.
    }
  }
  return { score: null, counts: parsed };
}

export async function buildBadges(options, root) {
  const { aislopText, doctorText } = await loadToolText(options, root);
  const doctor = await reactDoctorScore(root, doctorText, options.skipApi);
  return {
    "aislop.json": aislopBadge(parseAislopScore(aislopText)),
    "react-doctor.json": reactDoctorBadge(doctor.score, doctor.counts),
  };
}

async function writeBadges(outDir, badges) {
  await mkdir(outDir, { recursive: true });
  for (const [name, badge] of Object.entries(badges)) {
    const file = path.join(outDir, name);
    await writeFile(file, `${JSON.stringify(badge, null, 2)}\n`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = await repoRoot();
  const badges = await buildBadges(options, root);
  const outDir = path.resolve(root, options.out);
  await writeBadges(outDir, badges);
  process.stdout.write(`${JSON.stringify(badges, null, 2)}\n`);
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
