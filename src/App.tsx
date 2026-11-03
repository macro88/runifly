import { Layout, Space } from "antd";
import "./App.css";
import { Content, Footer, Header } from "antd/es/layout/layout";
import PlayListManager from "./components/PlayListManager";
import { CourseProvider } from "./data/CourseContext";
import SpotifyUser from "./components/SpotifyUser";
import SpotifySetup from "./components/SpotifySetup";
import SpotifySettings from "./components/SpotifySettings";
import { PlaylistProvider } from "./data/PlaylistContext";
import { ThemeProvider } from "./data/ThemeContext";
import DarkModeToggle from "./components/DarkModeToggle";
import { SpotifyAuthProvider, useSpotifyAuth } from "./spotify/auth";
import { isFixturesMode } from "./fixtures/playlist";

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
        }}
      >
        Runifly
        <Space>
          <DarkModeToggle />
          <SpotifyUser />
        </Space>
      </Header>
      <Content style={{ padding: "0 48px" }}>
        {!fixtures && <SpotifySettings />}
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
