import React, { useContext } from "react";
import { Button } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { useCourseContext } from "../data/CourseContext";
import { usePlaylistContext } from "../data/PlaylistContext";

const ResetButton: React.FC = () => {
  const { reset } = useCourseContext();
  const { syncRequired } = usePlaylistContext();

  const handleSync = () => {};

  return (
    <Button
      type={syncRequired ? "primary" : "dashed"}
      shape="circle"
      onClick={handleSync}
      title="Sync with Spotify"
    >
      <SyncOutlined />
    </Button>
  );
};

export default ResetButton;
