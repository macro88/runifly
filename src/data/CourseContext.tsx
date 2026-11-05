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
  CLIMB_COST_STORAGE_KEY,
  HILL_ADJUST_STORAGE_KEY,
  classifyCourseElevation,
  clampClimbCost,
  effectiveHillAdjust,
  parseClimbCost,
  adjustedRunSecondsForDistance,
  parseHillAdjust,
  timingCurveForCourse,
  type CourseElevation,
  type TimeDistanceCurve,
} from "./hillCurve";
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
  courseElevation: CourseElevation;
  adjustForHills: boolean;
  climbCostSecondsPerMetre: number;
  hillCurve: TimeDistanceCurve | null;
  adjustedRunSeconds: number | null;
  setDistance: (distance: number) => void;
  setTargetTime: (targetTime: RaceDuration) => void;
  setName: (name: string) => void;
  setGpx: (gpx: Gpx) => void;
  setAdjustForHills: (on: boolean) => void;
  setClimbCost: (secondsPerMetre: number) => void;
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
  const [climbCostSecondsPerMetre, setClimbCostSecondsPerMetre] = useState(() =>
    parseClimbCost(window.localStorage.getItem(CLIMB_COST_STORAGE_KEY))
  );
  const [hillAdjustPreference, setHillAdjustPreference] = useState<boolean | null>(
    () => parseHillAdjust(window.localStorage.getItem(HILL_ADJUST_STORAGE_KEY))
  );

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
  const courseElevation = useMemo(
    () => classifyCourseElevation(gpx.points),
    [gpx]
  );
  const adjustForHills = effectiveHillAdjust(
    hillAdjustPreference,
    courseElevation
  );
  const hillCurve = useMemo(
    () =>
      timingCurveForCourse(
        gpx.points,
        pace,
        climbCostSecondsPerMetre,
        adjustForHills
      ),
    [adjustForHills, climbCostSecondsPerMetre, gpx, pace]
  );
  const adjustedRunSeconds = useMemo(() => {
    if (!hillCurve) return null;
    const last = gpx.points[gpx.points.length - 1];
    const gpxKilometres = last ? last.totalDistance / 1000 : 0;
    return adjustedRunSecondsForDistance(
      hillCurve.totalTimeSeconds,
      gpxKilometres,
      distance
    );
  }, [distance, gpx, hillCurve]);

  const setAdjustForHills = useCallback((on: boolean) => {
    window.localStorage.setItem(HILL_ADJUST_STORAGE_KEY, on ? "1" : "0");
    setHillAdjustPreference(on);
  }, []);

  const setClimbCost = useCallback((secondsPerMetre: number) => {
    const next = clampClimbCost(secondsPerMetre);
    window.localStorage.setItem(CLIMB_COST_STORAGE_KEY, String(next));
    setClimbCostSecondsPerMetre(next);
  }, []);

  const value = useMemo(
    () => ({
      distance,
      pace,
      targetTime,
      name,
      gpx,
      courseElevation,
      adjustForHills,
      climbCostSecondsPerMetre,
      hillCurve,
      adjustedRunSeconds,
      setDistance,
      setTargetTime,
      setName,
      reset,
      setGpx,
      setAdjustForHills,
      setClimbCost,
    }),
    [
      adjustForHills,
      adjustedRunSeconds,
      climbCostSecondsPerMetre,
      courseElevation,
      distance,
      gpx,
      hillCurve,
      name,
      pace,
      reset,
      setAdjustForHills,
      setClimbCost,
      setDistance,
      setTargetTime,
      targetTime,
    ]
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
