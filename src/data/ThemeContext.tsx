// CourseContext.tsx
import { ConfigProvider, theme } from "antd";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface ThemeContextType {
  darkMode: boolean;
  primaryColor: string;
  setDarkMode: (darkMode: boolean) => void;
  setPrimaryColor: (primaryColor: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [primaryColor, setPrimaryColor] = useState<string>("#1DB954");
  const {
    token: { colorFillContent },
  } = theme.useToken();

  const value = {
    darkMode,
    primaryColor,
    setDarkMode,
    setPrimaryColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        componentSize="large"
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            // Seed Token
            colorPrimary: primaryColor,
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
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

// Hook lives next to its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
};
