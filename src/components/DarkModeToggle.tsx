import React from "react";
import { Switch } from "antd";
import { useThemeContext } from "../data/ThemeContext";

const DarkModeToggle: React.FC = () => {
  const { darkMode, setDarkMode } = useThemeContext();

  return (
    <Switch
      checked={darkMode}
      checkedChildren="Dark"
      unCheckedChildren="Light"
      onChange={(checked) => setDarkMode(checked)}
    />
  );
};

export default DarkModeToggle;
