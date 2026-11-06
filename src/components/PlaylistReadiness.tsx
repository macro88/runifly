import { useState } from "react";
import { Alert, Checkbox, InputNumber, Typography } from "antd";
import { useCourseContext } from "../data/CourseContext";
import {
  playlistCoverage,
  shortfallSummary,
  shortfallWarning,
  type PlaylistCoverage,
} from "../data/coverage";
import { usePlaylistContext } from "../data/PlaylistContext";

const CROSSFADE_STORAGE_KEY = "runifly-spotify-crossfade-seconds";
const CROSSFADE_MAX_SECONDS = 12;
const DETAIL_ID = "playlist-length-detail";

const INCOMPLETE_COPY =
  "Timing only holds if shuffle is off and crossfade matches what you enter below.";
const CHECKLIST_SUMMARY = "Confirm shuffle and crossfade";
const READY_COPY = "Ready for the run";
const CROSSFADE_HINT =
  "Open Spotify → Settings → Playback → Crossfade. Enter the same number here (0 if crossfade is off).";
const CROSSFADE_EMPTY = "Enter your Spotify crossfade, or 0 if it is off.";
const CROSSFADE_LABEL = "Crossfade in Spotify (seconds)";

function readStoredCrossfade(): number | null {
  const raw = window.localStorage.getItem(CROSSFADE_STORAGE_KEY);
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > CROSSFADE_MAX_SECONDS) {
    return null;
  }
  return value;
}

function writeStoredCrossfade(value: number | null): void {
  if (value === null) {
    window.localStorage.removeItem(CROSSFADE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(CROSSFADE_STORAGE_KEY, String(value));
}

function storedCrossfadeFromInput(value: number | string | null): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (value === null || value === "" || !Number.isFinite(parsed)) return null;
  return Math.min(CROSSFADE_MAX_SECONDS, Math.max(0, Math.round(parsed)));
}

const summaryButtonStyle = {
  background: "transparent",
  border: 0,
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  padding: 0,
  textAlign: "left" as const,
};

function CrossfadeField({
  draft,
  onDraft,
  onCommit,
}: {
  draft: number | null;
  onDraft: (value: number | null) => void;
  onCommit: (value: number | null) => void;
}) {
  const missing = draft === null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span>Crossfade (seconds)</span>
      <InputNumber
        aria-label={CROSSFADE_LABEL}
        aria-invalid={missing}
        aria-required
        aria-describedby={missing ? "crossfade-required" : undefined}
        status={missing ? "error" : undefined}
        min={0}
        max={CROSSFADE_MAX_SECONDS}
        precision={0}
        step={1}
        value={draft}
        onChange={(value) => {
          onDraft(storedCrossfadeFromInput(value));
        }}
        onBlur={() => {
          onCommit(draft);
        }}
        style={{ width: 72 }}
      />
      {missing && (
        <Typography.Text id="crossfade-required" type="danger">
          Required
        </Typography.Text>
      )}
    </span>
  );
}

function ReadinessDetail({
  coverage,
  crossfadeMissing,
}: {
  coverage: PlaylistCoverage;
  crossfadeMissing: boolean;
}) {
  const lead = coverage.short
    ? shortfallWarning(coverage.shortfallSeconds)
    : INCOMPLETE_COPY;
  return (
    <div id={DETAIL_ID}>
      <Typography.Paragraph style={{ marginBottom: 8 }}>{lead}</Typography.Paragraph>
      <Typography.Text strong>Before you run</Typography.Text>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        {CROSSFADE_HINT}
      </Typography.Paragraph>
      {crossfadeMissing && (
        <Typography.Paragraph type="danger" style={{ marginBottom: 0 }}>
          {CROSSFADE_EMPTY}
        </Typography.Paragraph>
      )}
    </div>
  );
}

function ReadinessBar({
  summary,
  detailsOpen,
  onToggle,
  shuffleOff,
  onShuffle,
  draft,
  onDraft,
  onCommit,
}: {
  summary: string;
  detailsOpen: boolean;
  onToggle: () => void;
  shuffleOff: boolean;
  onShuffle: (checked: boolean) => void;
  draft: number | null;
  onDraft: (value: number | null) => void;
  onCommit: (value: number | null) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      <button
        type="button"
        aria-expanded={detailsOpen}
        aria-controls={DETAIL_ID}
        onClick={onToggle}
        style={summaryButtonStyle}
      >
        {summary}
        <span aria-hidden="true">{detailsOpen ? "  ▴" : "  ▾"}</span>
      </button>
      <Checkbox
        checked={shuffleOff}
        onChange={(event) => onShuffle(event.target.checked)}
      >
        Shuffle is off in Spotify
      </Checkbox>
      <CrossfadeField draft={draft} onDraft={onDraft} onCommit={onCommit} />
    </div>
  );
}

const PlaylistReadiness = () => {
  const { playlistKey, songs, loading, playlistError } = usePlaylistContext();
  const { targetTime, adjustedRunSeconds } = useCourseContext();
  const [shuffleOff, setShuffleOff] = useState(false);
  const [crossfade, setCrossfade] = useState<number | null>(readStoredCrossfade);
  const [crossfadeDraft, setCrossfadeDraft] = useState<number | null>(crossfade);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!playlistKey || loading || playlistError || songs.length === 0) {
    return null;
  }

  // The run is the target on the form. Reset can pin a different pace for the
  // song rows without changing that target. Hills leave that target alone and
  // pass the climb-adjusted total for the distance on the form.
  const coverage = playlistCoverage({
    durationsSeconds: songs.map((song) => song.songDuration),
    runSeconds: adjustedRunSeconds ?? targetTime.asSeconds(),
    crossfadeSeconds: crossfade ?? 0,
  });
  const checklistDone = shuffleOff && crossfade !== null;

  if (checklistDone && !coverage.short) {
    return <Alert type="success" showIcon={false} title={READY_COPY} />;
  }

  const summary = coverage.short
    ? shortfallSummary(coverage.shortfallSeconds)
    : CHECKLIST_SUMMARY;

  return (
    <Alert
      type="warning"
      showIcon
      title={
        <ReadinessBar
          summary={summary}
          detailsOpen={detailsOpen}
          onToggle={() => setDetailsOpen((open) => !open)}
          shuffleOff={shuffleOff}
          onShuffle={setShuffleOff}
          draft={crossfadeDraft}
          onDraft={setCrossfadeDraft}
          onCommit={(value) => {
            writeStoredCrossfade(value);
            setCrossfade(value);
          }}
        />
      }
      description={
        detailsOpen ? (
          <ReadinessDetail
            coverage={coverage}
            crossfadeMissing={crossfadeDraft === null}
          />
        ) : undefined
      }
    />
  );
};

export default PlaylistReadiness;
