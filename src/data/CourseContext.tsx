// CourseContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Gpx, createFakeGpx } from "../utils/gpxUtils";
import {
  RaceDuration,
  calculatePace,
  starterTargetTime,
} from "./pace";

interface CourseContextType {
  distance: number;
  pace: number;
  targetTime: RaceDuration;
  name: string;
  gpx: Gpx;
  setDistance: (distance: number) => void;
  setTargetTime: (targetTime: RaceDuration) => void;
  setName: (name: string) => void;
  setGpx: (gpx: Gpx) => void;
  reset: () => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

interface CourseProviderProps {
  children: ReactNode;
}

const defaultValues = {
  distance: 42.196,
  pace: 5.0,
  name: "Runifly",
  gpx: createFakeGpx("fake", 42.196, 5.0),
};

const starterTarget = starterTargetTime(defaultValues.distance);

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [distance, setDistanceState] = useState<number>(defaultValues.distance);
  const [targetTime, setTargetTimeState] = useState<RaceDuration>(starterTarget);
  // Reset used to write pace 5 while leaving the form's target alone, and the
  // pace effect only corrected that when distance actually changed. The pin
  // keeps that split: songs see 5s/km, the form still shows its target.
  const [pinnedPace, setPinnedPace] = useState<number | null>(null);
  const [name, setName] = useState<string>(defaultValues.name);
  const [gpx, setGpx] = useState<Gpx>(defaultValues.gpx);

  const setDistance = useCallback((next: number) => {
    setPinnedPace(null);
    setDistanceState(next);
  }, []);

  const setTargetTime = useCallback((next: RaceDuration) => {
    setPinnedPace(null);
    setTargetTimeState(next);
  }, []);

  const reset = useCallback(() => {
    setPinnedPace(
      distance === defaultValues.distance ? defaultValues.pace : null
    );
    setDistanceState(defaultValues.distance);
    setName(defaultValues.name);
    setGpx(defaultValues.gpx);
  }, [distance]);

  const pace = pinnedPace ?? calculatePace(targetTime, distance).asSeconds();

  const value = useMemo(
    () => ({
      distance,
      pace,
      targetTime,
      name,
      gpx,
      setDistance,
      setTargetTime,
      setName,
      reset,
      setGpx,
    }),
    [distance, gpx, name, pace, reset, setDistance, setTargetTime, targetTime]
  );

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};

// Hook lives next to its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useCourseContext = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourseContext must be used within a CourseProvider");
  }
  return context;
};
