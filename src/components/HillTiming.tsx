import { Form, InputNumber, Space, Switch, Typography } from "antd";
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

const HillTiming = () => {
  const {
    courseElevation,
    adjustForHills,
    climbCostSecondsPerMetre,
    setAdjustForHills,
    setClimbCost,
  } = useCourseContext();

  if (courseElevation === "missing") {
    return (
      <section aria-label="Hills">
        <Typography.Text>{NO_ELEVATION}</Typography.Text>
      </section>
    );
  }

  return (
    <section aria-label="Hills">
      <Form
        component="div"
        colon={false}
        requiredMark={false}
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
      >
        <Space align="center" wrap>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Switch
              aria-label={TOGGLE_LABEL}
              checked={adjustForHills}
              onChange={setAdjustForHills}
            />
            <span>{TOGGLE_LABEL}</span>
          </span>
          {adjustForHills && (
            <Form.Item label={COST_LABEL} style={{ marginBottom: 0 }}>
              <InputNumber
                aria-label={COST_LABEL}
                min={0}
                max={20}
                step={1}
                precision={0}
                value={climbCostSecondsPerMetre}
                onChange={(value) => {
                  if (value === null) return;
                  setClimbCost(clampClimbCost(value));
                }}
                style={{ width: 88 }}
              />
            </Form.Item>
          )}
        </Space>
        {adjustForHills && (
          <Space orientation="vertical" size={0}>
            <Typography.Text type="secondary">{TOGGLE_HINT}</Typography.Text>
            <Typography.Text type="secondary">{COST_HINT}</Typography.Text>
          </Space>
        )}
      </Form>
    </section>
  );
};

export default HillTiming;
