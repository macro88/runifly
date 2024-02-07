import React, { useEffect, useRef, useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { Button, Card, Space } from "antd";
//import GpxParser from "gpxparser";

import { ElevationGraph } from "./ElevationGraph";

import {
  Gpx,
  createFakeGpx,
  parseFile,
  totalDistance,
} from "../utils/gpxUtils";
import { useCourseContext } from "../data/CourseContext";

interface CourseViewerProps {
  onFileDrop: (file: File) => void;
}

const CourseViewer: React.FC<CourseViewerProps> = ({ onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { name, distance, pace, gpx, setDistance, setName, setGpx } =
    useCourseContext();

  useEffect(() => {
    if (!gpx) setGpx(createFakeGpx(name, distance, pace));
  }, [name, distance, pace]);

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file.name.endsWith(".gpx")) {
      const loadedGpx = await parseFile(file);
      setGpx(loadedGpx);
      setName(loadedGpx.name);
      setDistance(Number((totalDistance(loadedGpx) / 1000).toFixed(2)));
      if (onFileDrop) onFileDrop(file);
    } else {
      console.log("Invalid file type. Only .gpx files are allowed.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files === null) return;
    const file = event.target.files[0];
    console.log(file);
    if (onFileDrop) onFileDrop(file);
  };

  return (
    <div
      className={`course-viewer ${isDragging ? "dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ width: "100%", height: "200px" }}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".gpx"
        multiple={false}
      />

      {gpx && (
        <Card>
          <ElevationGraph gpx={gpx} />
        </Card>
      )}
    </div>
  );
};

export default CourseViewer;
