import { Layout, Space } from "antd";
import "./App.css";
import { Content, Footer, Header } from "antd/es/layout/layout";
import PlayListManager from "./components/PlayListManager";
import { CourseProvider } from "./data/CourseContext";
import SpotifyUser from "./components/SpotifyUser";
import { PlaylistProvider } from "./data/PlaylistContext";
import { ThemeProvider } from "./data/ThemeContext";
import DarkModeToggle from "./components/DarkModeToggle";
import { SpotifyAuthProvider } from "./spotify/auth";

function App() {
  return (
    <ThemeProvider>
      <CourseProvider>
        <SpotifyAuthProvider>
          <PlaylistProvider>
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
              <PlayListManager />
            </Content>

            <Footer>©{new Date().getFullYear()} Created with &hearts;</Footer>
          </Layout>
          </PlaylistProvider>
        </SpotifyAuthProvider>
      </CourseProvider>
    </ThemeProvider>
  );
}

export default App;
