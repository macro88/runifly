// CourseContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Gpx, createFakeGpx } from "../utils/gpxUtils";

interface CourseContextType {
  distance: number;
  pace: number;
  name: string;
  gpx: Gpx;
  setDistance: (distance: number) => void;
  setPace: (pace: number) => void;
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

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [distance, setDistance] = useState<number>(defaultValues.distance);
  const [pace, setPace] = useState<number>(defaultValues.pace);
  const [name, setName] = useState<string>(defaultValues.name);
  const [gpx, setGpx] = useState<Gpx>(defaultValues.gpx);

  const reset = () => {
    setDistance(defaultValues.distance);
    setPace(defaultValues.pace);
    setName(defaultValues.name);
    setGpx(defaultValues.gpx);
  };

  const value = {
    distance,
    pace,
    name,
    gpx,
    setDistance,
    setPace,
    setName,
    reset,
    setGpx,
  };

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
