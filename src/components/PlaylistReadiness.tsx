import { useState } from "react";
import { Alert, Checkbox, Form, InputNumber, Space, Typography } from "antd";
import { useCourseContext } from "../data/CourseContext";
import { playlistCoverage, shortfallWarning } from "../data/coverage";
import { usePlaylistContext } from "../data/PlaylistContext";

const CROSSFADE_STORAGE_KEY = "runifly-spotify-crossfade-seconds";
const CROSSFADE_MAX_SECONDS = 12;

const INCOMPLETE_COPY =
  "Timing only holds if shuffle is off and crossfade matches what you enter below.";
const READY_COPY = "Ready for the run";
const CROSSFADE_HINT =
  "Open Spotify → Settings → Playback → Crossfade. Enter the same number here (0 if crossfade is off).";
const CROSSFADE_EMPTY = "Enter your Spotify crossfade, or 0 if it is off.";

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

const PlaylistReadiness = () => {
  const { playlistKey, songs, loading, playlistError } = usePlaylistContext();
  const { targetTime, adjustedRunSeconds } = useCourseContext();
  const [shuffleOff, setShuffleOff] = useState(false);
  const [crossfade, setCrossfade] = useState<number | null>(readStoredCrossfade);
  const [crossfadeDraft, setCrossfadeDraft] = useState<number | null>(crossfade);

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

  return (
    <Alert
      type="warning"
      showIcon
      title={
        coverage.short
          ? shortfallWarning(coverage.shortfallSeconds)
          : INCOMPLETE_COPY
      }
      description={
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          <Typography.Text strong>Before you run</Typography.Text>
          <Checkbox
            checked={shuffleOff}
            onChange={(event) => setShuffleOff(event.target.checked)}
          >
            Shuffle is off in Spotify
          </Checkbox>
          <Form component="div" colon={false} requiredMark={false}>
            <Form.Item
              label="Crossfade in Spotify (seconds)"
              extra={CROSSFADE_HINT}
              help={crossfadeDraft === null ? CROSSFADE_EMPTY : undefined}
              validateStatus={crossfadeDraft === null ? "error" : undefined}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                aria-label="Crossfade in Spotify (seconds)"
                min={0}
                max={CROSSFADE_MAX_SECONDS}
                precision={0}
                step={1}
                value={crossfadeDraft}
                onChange={(value) => {
                  setCrossfadeDraft(storedCrossfadeFromInput(value));
                }}
                onBlur={() => {
                  writeStoredCrossfade(crossfadeDraft);
                  setCrossfade(crossfadeDraft);
                }}
                style={{ width: 88 }}
              />
            </Form.Item>
          </Form>
        </Space>
      }
    />
  );
};

export default PlaylistReadiness;
