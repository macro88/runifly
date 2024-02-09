import React from "react";
import { Button } from "antd";
import { PoweroffOutlined } from "@ant-design/icons";
import { useCourseContext } from "../data/CourseContext";
import { usePlaylistContext } from "../data/PlaylistContext";

const ResetButton: React.FC = () => {
  const { reset } = useCourseContext();
  const { reset: resetPlaylist } = usePlaylistContext();

  const handleReset = () => {
    reset();
    resetPlaylist();
  };

  return (
    <Button type="dashed" shape="circle" onClick={handleReset} title="Reset">
      <PoweroffOutlined />
    </Button>
  );
};

export default ResetButton;
