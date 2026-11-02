import React, { useRef, useState } from "react";
import { Card } from "antd";
import { ElevationGraph } from "./ElevationGraph";

import { parseFile, totalDistance } from "../utils/gpxUtils";
import { useCourseContext } from "../data/CourseContext";

interface CourseViewerProps {
  onFileDrop: (file: File) => void;
}

const CourseViewer: React.FC<CourseViewerProps> = ({ onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { gpx, setDistance, setName, setGpx } = useCourseContext();

  const handleDragEnter = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const loadCourseFile = async (file: File) => {
    if (!file.name.endsWith(".gpx")) {
      console.log("Invalid file type. Only .gpx files are allowed.");
      return;
    }

    const loadedGpx = await parseFile(file);
    setGpx(loadedGpx);
    setName(loadedGpx.name);
    setDistance(Number((totalDistance(loadedGpx) / 1000).toFixed(2)));
    if (onFileDrop) onFileDrop(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (!file) return;
    await loadCourseFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void loadCourseFile(file);
  };

  return (
    <div style={{ width: "100%" }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".gpx"
        aria-label="Course GPX file"
        multiple={false}
      />
      <button
        type="button"
        className={`course-viewer ${isDragging ? "dragging" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          width: "100%",
          height: "200px",
          padding: 0,
          border: "none",
          background: "transparent",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          display: "block",
          cursor: "inherit",
        }}
      >
        {gpx && (
          <Card>
            <ElevationGraph />
          </Card>
        )}
      </button>
    </div>
  );
};

export default CourseViewer;
