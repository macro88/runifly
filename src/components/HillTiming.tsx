import { useState } from "react";
import { InputNumber, Switch, theme, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useCourseContext } from "../data/CourseContext";
import { clampClimbCost } from "../data/hillCurve";

const TOGGLE_LABEL = "Adjust for hills";
const TOGGLE_HINT =
  "Climbs add time, so later songs stay on the map. Descents keep your flat pace.";
const COST_LABEL = "Climb cost (seconds per metre)";
const COST_HINT =
  "Default 6 (about Naismith). Raise it if you hike the hills; set 0 for flat timing.";
const NO_ELEVATION =
  "This route has no elevation data, so timing stays flat.";
const NOTES_LABEL = "Hill timing notes";

const noteButtonStyle = {
  background: "transparent",
  border: 0,
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  padding: 0,
};

const HillTiming = () => {
  const {
    courseElevation,
    adjustForHills,
    climbCostSecondsPerMetre,
    setAdjustForHills,
    setClimbCost,
  } = useCourseContext();
  const [notesOpen, setNotesOpen] = useState(false);
  const {
    token: { colorBgElevated, colorText, borderRadius, boxShadowSecondary },
  } = theme.useToken();

  if (courseElevation === "missing") {
    return (
      <section aria-label="Hills">
        <Typography.Text>{NO_ELEVATION}</Typography.Text>
      </section>
    );
  }

  return (
    <section aria-label="Hills" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Switch
            aria-label={TOGGLE_LABEL}
            checked={adjustForHills}
            onChange={(on) => {
              if (!on) setNotesOpen(false);
              setAdjustForHills(on);
            }}
          />
          <span>{TOGGLE_LABEL}</span>
        </span>
        {adjustForHills && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>{COST_LABEL}</span>
            <InputNumber
              aria-label={COST_LABEL}
              size="small"
              min={0}
              max={20}
              step={1}
              precision={0}
              value={climbCostSecondsPerMetre}
              onChange={(value) => {
                if (value === null) return;
                setClimbCost(clampClimbCost(value));
              }}
              style={{ width: 72 }}
            />
          </span>
        )}
        {adjustForHills && (
          <button
            type="button"
            aria-label={NOTES_LABEL}
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
            style={noteButtonStyle}
          >
            <InfoCircleOutlined />
          </button>
        )}
      </div>
      {adjustForHills && notesOpen && (
        <div
          role="note"
          style={{
            position: "absolute",
            zIndex: 5,
            top: "100%",
            left: 0,
            marginTop: 4,
            maxWidth: 480,
            padding: "8px 12px",
            background: colorBgElevated,
            color: colorText,
            borderRadius,
            boxShadow: boxShadowSecondary,
          }}
        >
          <div>{TOGGLE_HINT}</div>
          <div>{COST_HINT}</div>
        </div>
      )}
    </section>
  );
};

export default HillTiming;
