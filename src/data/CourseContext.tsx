// CourseContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

interface CourseContextType {
  distance: number;
  pace: number;
  name: string;
  setDistance: (distance: number) => void;
  setPace: (pace: number) => void;
  setName: (name: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

interface CourseProviderProps {
  children: ReactNode;
}

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [distance, setDistance] = useState<number>(42.196);
  const [pace, setPace] = useState<number>(5.0);
  const [name, setName] = useState<string>("Runifly");

  const value = {
    distance,
    pace,
    name,
    setDistance,
    setPace,
    setName,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};

export const useCourseContext = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourseContext must be used within a CourseProvider");
  }
  return context;
};
