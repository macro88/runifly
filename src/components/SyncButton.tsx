import React, { useContext } from "react";
import { Button } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { useCourseContext } from "../data/CourseContext";
import { usePlaylistContext } from "../data/PlaylistContext";

const ResetButton: React.FC = () => {
  const { reset } = useCourseContext();
  const { syncRequired, sync, loading } = usePlaylistContext();

  const handleSync = () => {
    sync();
  };

  return (
    <Button
      type={syncRequired ? "primary" : "dashed"}
      shape="circle"
      loading={loading}
      onClick={handleSync}
      title="Sync with Spotify"
      icon={<SyncOutlined />}
    ></Button>
  );
};

export default ResetButton;
