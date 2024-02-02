import React, { useState, useEffect } from "react";
import { Form, Space, TimePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useCourseContext } from "../data/CourseContext";

dayjs.extend(duration);

type Duration = ReturnType<typeof dayjs.duration>;

interface TargetTimePaceProps {}

const TargetTimePace: React.FC<TargetTimePaceProps> = ({}) => {
  const { distance, setDistance, setPace } = useCourseContext();

  const defaultPace = dayjs.duration(5.5 * 60, "seconds");

  const [inputPace, setInputPace] = useState(defaultPace);
  const [inputTargetTime, setInputTargetTime] = useState(
    dayjs.duration(defaultPace.asSeconds() * distance * 1000)
  );

  const [calculatedTargetTime, setCalculatedTargetTime] = useState(
    dayjs.duration(defaultPace.asSeconds() * distance * 1000)
  );

  function calculatePace(time: Duration, distance: number): Duration {
    const totalSeconds = time.asSeconds();
    const paceInSecondsPerKm = totalSeconds / distance;
    return dayjs.duration(paceInSecondsPerKm, "seconds");
  }

  function calculateTargetTime(pace: Duration, distance: number): Duration {
    const paceInSecondsPerKm = pace.asSeconds();
    const totalSeconds = paceInSecondsPerKm * distance;
    return dayjs.duration(totalSeconds, "seconds");
  }

  const handleDistanceChange = (value: number | null) => {
    if (!value) return;
    setDistance(value);
    const targetTime = calculateTargetTime(inputPace, value);
    setInputTargetTime(targetTime);
    setCalculatedTargetTime(targetTime);
  };

  const handleTargetTimeChange = (time: dayjs.Dayjs | null) => {
    if (!time) return;
    const newTargetTime = dayjs.duration(
      time.hour() * 3600 + time.minute() * 60 + time.second(),
      "seconds"
    );
    setInputTargetTime(newTargetTime);
    const pace = calculatePace(newTargetTime, distance);
    setInputPace(pace);
    setPace(pace.seconds());
  };

  const handlePaceChange = (time: dayjs.Dayjs | null) => {
    if (!time) return;
    const newPace = dayjs.duration(
      time.minute() * 60 + time.second(),
      "seconds"
    );
    setInputPace(newPace);
    setPace(newPace.seconds());
    const targetTime = calculateTargetTime(newPace, distance);
    setInputTargetTime(targetTime);
    setCalculatedTargetTime(targetTime);
  };

  useEffect(() => {
    const pace = calculatePace(inputTargetTime, distance);
    setInputPace(pace);
    setPace(pace.seconds());
  }, [inputTargetTime, distance]);

  useEffect(() => {
    const time = calculateTargetTime(inputPace, distance);
    setCalculatedTargetTime(time);
  }, [inputPace, distance]);

  return (
    <Form layout="horizontal">
      <Space>
        <Form.Item label="Distance (km)">
          <InputNumber
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
