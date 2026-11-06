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
import { documentTitleForRun, formatRunTitle } from "./runTitle";

function RunHeading() {
  const { name, setName, gpx } = useCourseContext();
  const { playlistKey, playlistName } = usePlaylistContext();
  const courseLoaded = gpx.name !== "fake";
  const loadedPlaylist =
    playlistKey && playlistName?.trim() ? playlistName.trim() : null;
  // The starter course is the brand name on a generated route. A chosen
  // playlist replaces that until a real GPX is loaded.
  const courseLabel = courseLoaded || !loadedPlaylist ? name : null;
  const runTitle = formatRunTitle(courseLabel, loadedPlaylist);
  const heading = (courseLabel ?? loadedPlaylist ?? "Runifly").trim() || "Runifly";

  useEffect(() => {
    document.title = documentTitleForRun(runTitle);
  }, [runTitle]);

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
      {runTitle !== "Runifly" && <span style={{ flex: "none" }}>Runifly</span>}
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
            courseLabel !== null
              ? { onChange: setName, triggerType: ["text"] }
              : false
          }
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: "28px",
            fontWeight: 600,
            flex: "none",
            whiteSpace: "nowrap",
          }}
        >
          {heading}
        </Typography.Title>
        {courseLabel && loadedPlaylist && (
          <span
            style={{
              fontSize: 20,
              lineHeight: "28px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "pre",
              minWidth: 0,
            }}
          >
            {` - ${loadedPlaylist}`}
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
