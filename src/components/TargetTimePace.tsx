import { Form, Space, TimePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useCourseContext } from "../data/CourseContext";
import { calculatePace, calculateTargetTime } from "../data/pace";

dayjs.extend(duration);

const TargetTimePace = () => {
  const { distance, setDistance, targetTime, setTargetTime } = useCourseContext();

  const inputPace = calculatePace(targetTime, distance);
  const calculatedTargetTime = calculateTargetTime(inputPace, distance);

  const handleDistanceChange = (value: number | null) => {
    if (!value) return;
    setTargetTime(calculateTargetTime(inputPace, value));
    setDistance(value);
  };

  const handleTargetTimeChange = (time: dayjs.Dayjs | null) => {
    if (!time) return;
    setTargetTime(
      dayjs.duration(
        time.hour() * 3600 + time.minute() * 60 + time.second(),
        "seconds"
      )
    );
  };

  const handlePaceChange = (time: dayjs.Dayjs | null) => {
    if (!time) return;
    const newPace = dayjs.duration(
      time.minute() * 60 + time.second(),
      "seconds"
    );
    setTargetTime(calculateTargetTime(newPace, distance));
  };

  return (
    <Form layout="horizontal">
      <Space>
        <Form.Item label="Distance (km)">
          <InputNumber
            aria-label="Distance (km)"
            value={distance}
            min={1}
            max={500}
            onChange={handleDistanceChange}
          />
        </Form.Item>
        <Form.Item label="Target Time">
          <TimePicker
            value={dayjs()
              .startOf("day")
              .add(calculatedTargetTime.asMilliseconds(), "millisecond")}
            onChange={handleTargetTimeChange}
            format="HH:mm:ss"
          />
        </Form.Item>
        <Form.Item label="Pace">
          <Space>
            <TimePicker
              aria-label="Pace"
              value={dayjs(inputPace.asMilliseconds())}
              onChange={handlePaceChange}
              format="mm:ss"
            />
            <span>/km</span>
          </Space>
        </Form.Item>
      </Space>
    </Form>
  );
};

export default TargetTimePace;
