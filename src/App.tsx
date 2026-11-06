import { useEffect } from "react";
import { Layout, Space, Typography } from "antd";
import "./App.css";
import { Content, Footer, Header } from "antd/es/layout/layout";
import PlayListManager from "./components/PlayListManager";
import { CourseProvider, useCourseContext } from "./data/CourseContext";
import SpotifyUser from "./components/SpotifyUser";
import SpotifySetup from "./components/SpotifySetup";
import { PlaylistProvider, usePlaylistContext } from "./data/PlaylistContext";
import { ThemeProvider } from "./data/ThemeContext";
import DarkModeToggle from "./components/DarkModeToggle";
import { SpotifyAuthProvider, useSpotifyAuth } from "./spotify/auth";
import { isFixturesMode } from "./fixtures/playlist";
import { describeRunHeading, documentTitleForRun } from "./runTitle";

function RunHeading() {
  const { name, setName, courseFromFile } = useCourseContext();
  const { playlistKey, playlistName } = usePlaylistContext();
  const headingState = describeRunHeading({
    courseFromFile,
    courseName: name,
    playlistKey,
    playlistName,
  });

  useEffect(() => {
    document.title = documentTitleForRun(headingState.runTitle);
  }, [headingState.runTitle]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
        flex: 1,
      }}
    >
      {headingState.showBrand && <span style={{ flex: "none" }}>Runifly</span>}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Typography.Title
          level={1}
          editable={
            headingState.editable
              ? {
                  onChange: setName,
                  text: headingState.editText,
                  triggerType: headingState.editFromIcon ? ["icon"] : ["text"],
                }
              : false
          }
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: "28px",
            fontWeight: 600,
            flex: "1 1 auto",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {headingState.heading}
        </Typography.Title>
        {headingState.playlistSuffix && (
          <span
            style={{
              flex: "0 1 auto",
              maxWidth: "50%",
              minWidth: 0,
              fontSize: 20,
              lineHeight: "28px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "pre",
            }}
          >
            {` - ${headingState.playlistSuffix}`}
          </span>
        )}
      </div>
    </div>
  );
}

function Shell() {
  const { clientId } = useSpotifyAuth();
  const fixtures = isFixturesMode();
  const ready = fixtures || clientId !== null;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <RunHeading />
        <Space style={{ flex: "none" }}>
          <DarkModeToggle />
          <SpotifyUser />
        </Space>
      </Header>
      <Content style={{ padding: "0 48px" }}>
        {ready ? <PlayListManager /> : <SpotifySetup />}
      </Content>
      <Footer>©{new Date().getFullYear()} Created with &hearts;</Footer>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CourseProvider>
        <SpotifyAuthProvider>
          <PlaylistProvider>
            <Shell />
          </PlaylistProvider>
        </SpotifyAuthProvider>
      </CourseProvider>
    </ThemeProvider>
  );
}

export default App;
