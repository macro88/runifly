import assert from "node:assert/strict";
import test from "node:test";
import {
  aislopBadge,
  colorForScore,
  countMessage,
  parseAislopScore,
  parseDoctorCounts,
  reactDoctorBadge,
} from "./quality-badges.mjs";

test("colors a score by band", () => {
  assert.equal(colorForScore(100), "green");
  assert.equal(colorForScore(90), "green");
  assert.equal(colorForScore(89), "yellow");
  assert.equal(colorForScore(70), "yellow");
  assert.equal(colorForScore(69), "red");
  assert.equal(colorForScore(0), "red");
});

test("reads the aislop summary score", () => {
  const text = [
    "aislop 0.20.0",
    "   87 / 100  Healthy       0 errors  ·  13 warnings  ·  4 fixable",
    "Target score stays out of this line",
  ].join("\n");
  assert.equal(parseAislopScore(text), 87);
  assert.equal(parseAislopScore("no score here"), null);
  assert.equal(parseAislopScore("   101 / 100  no"), null);
});

test("sums react-doctor category lines and does not invent a score", () => {
  const text = [
    "Score disabled by --no-score. Want something custom to your company?",
    "14 issues",
    "Accessibility: 1 warning",
    "Bugs: 1 error, 6 warnings",
    "Performance: 6 warnings",
    "Docs: https://react.doctor/docs",
  ].join("\n");
  assert.deepEqual(parseDoctorCounts(text), {
    score: null,
    errorCount: 1,
    warningCount: 13,
  });
});

test("reads a numeric score from a react-doctor JSON summary", () => {
  const text = JSON.stringify({
    summary: { errorCount: 1, warningCount: 13, score: 52, scoreLabel: "Critical" },
  });
  assert.deepEqual(parseDoctorCounts(text), {
    score: 52,
    errorCount: 1,
    warningCount: 13,
  });
});

test("builds shields endpoints", () => {
  assert.deepEqual(aislopBadge(87), {
    schemaVersion: 1,
    label: "aislop",
    message: "87/100",
    color: "yellow",
    cacheSeconds: 300,
  });
  assert.equal(aislopBadge(null).message, "unavailable");
  assert.deepEqual(reactDoctorBadge(52, null).color, "red");
  assert.equal(reactDoctorBadge(52, null).message, "52/100");
  assert.equal(
    reactDoctorBadge(null, { errorCount: 1, warningCount: 13 }).message,
    "1 error, 13 warnings",
  );
  assert.equal(countMessage(0, 1), "0 errors, 1 warning");
});
