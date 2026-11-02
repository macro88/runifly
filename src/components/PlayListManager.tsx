import { Alert, Col, Row, Space, Typography, Image, Layout, theme } from "antd";
import React from "react";
import TargetTimePace from "./TargetTimePace";
import CourseViewer from "./CourseViewer";
import { useCourseContext } from "../data/CourseContext";
import SongList from "./SongList";
import Playlists from "./Playlists";
import { Content } from "antd/es/layout/layout";
import { useThemeContext } from "../data/ThemeContext";
import { darkPlaylist, lightPlaylist } from "../utils/placeholders";
import { usePlaylistContext } from "../data/PlaylistContext";
import ResetButton from "./ResetButton";
import SyncButton from "./SyncButton";

interface PlayListManagerProps {
  // Define your component props here
}

const PlayListManager: React.FC<PlayListManagerProps> = () => {
  const { name, setName } = useCourseContext();
  const { playlistKey, playlistImage, playlistError } = usePlaylistContext();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const { darkMode } = useThemeContext();

  return (
    <Layout
      style={{
        padding: "24px 0",
        background: colorBgContainer,
        borderRadius: borderRadiusLG,
      }}
    >
      <Content style={{ padding: "0 24px" }}>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Row gutter={10}>
            <Col>
              <Image
                width={100}
                height={100}
                src={playlistImage ? playlistImage : undefined}
                fallback={darkMode ? darkPlaylist : lightPlaylist}
                style={{ objectFit: "cover", height: "100%", width: "100%" }}
              />
            </Col>
            <Col flex="auto">
              <Space
                orientation="vertical"
                align="start"
                style={{ width: "100%" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography.Title
                    editable={{ onChange: setName, triggerType: ["text"] }}
                    level={1}
                    style={{ margin: 0 }}
                  >
                    {name}
                  </Typography.Title>
                </div>
                <TargetTimePace />
              </Space>
            </Col>
            <Col>
              <Space>
                <SyncButton />
                <ResetButton />
              </Space>
            </Col>
          </Row>
          <Row>
            <CourseViewer onFileDrop={() => {}} />
          </Row>
          <Space orientation="vertical" style={{ width: "100%" }}>
            {!playlistKey && <Playlists />}
            {playlistKey && playlistError && (
              <Alert type="warning" showIcon title={playlistError} />
            )}
            {/* {playlistKey && <SongList />} */}
            <SongList />
          </Space>
        </Space>
      </Content>
    </Layout>
  );
};

export default PlayListManager;
