import { Avatar, ConfigProvider, Layout, Switch, theme } from "antd";
import "./App.css";
import { useState } from "react";
import { Content, Footer, Header } from "antd/es/layout/layout";
import PlayListManager from "./components/PlayListManager";
import { CourseProvider } from "./data/CourseContext";
import SpotifyUser from "./components/SpotifyUser";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const {
    token: { colorFillContent, borderRadiusLG },
  } = theme.useToken();
  return (
    <ConfigProvider
      componentSize="large"
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          // Seed Token
          colorPrimary: "#1DB954",
          borderRadius: 20,
        },
        components: {
          Layout: {
            headerBg: colorFillContent,
            algorithm: true,
          },
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Runifly
          <SpotifyUser />
          <Switch
            checked={darkMode}
            checkedChildren="Dark"
            unCheckedChildren="Light"
            onChange={(checked) => setDarkMode(checked)}
          />
        </Header>
        <Content
          style={{
            padding: "48px 48px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <>
            <div
              style={{
                padding: 24,
                textAlign: "center",
                background: colorFillContent,
                borderRadius: borderRadiusLG,
              }}
            >
              <CourseProvider>
                <PlayListManager />
              </CourseProvider>
            </div>
          </>
        </Content>

        <Footer>©{new Date().getFullYear()} Created with &hearts;</Footer>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
