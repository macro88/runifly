import { Avatar, ConfigProvider, Layout, Space, Switch, theme } from "antd";
import "./App.css";
import { useEffect, useState } from "react";
import { Content, Footer, Header } from "antd/es/layout/layout";
import PlayListManager from "./components/PlayListManager";
import { CourseProvider } from "./data/CourseContext";
import SpotifyUser from "./components/SpotifyUser";
import { PlaylistProvider } from "./data/PlaylistContext";
import { ThemeProvider, useThemeContext } from "./data/ThemeContext";
import DarkModeToggle from "./components/DarkModeToggle";

function App() {
  return (
    <ThemeProvider>
      <CourseProvider>
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
      </CourseProvider>
    </ThemeProvider>
  );
}

export default App;
