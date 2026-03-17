import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import { Server } from "./data/DTO";

import { ThemeProvider } from "styled-components";
import { useTauriEvent } from "./hooks/useTauriEvent";
import { BBSWizard } from "./pages/BBSWizard";
import { MainPage } from "./pages/MainPage";

// pick a theme of your choice
import react95themes from "react95/dist/themes";
import original from "react95/dist/themes/original";

import { Theme } from "react95/dist/common/themes/types";
import { ViewSettings } from "./AppSettings";
import { Menu } from "./features/Menu";
import { TitleBar } from "./features/TitleBar";
import { GlobalStyles } from "./GlobalStyles";
import {
  aboutDialog,
  handleExitApp,
  importQWKFileToDB,
} from "./interop/Interop";

import "./App.css";

type ThemeName = Exclude<keyof typeof react95themes, "default">;

const themeNames: string[] = Object.keys(react95themes).filter(
  (name) =>
    name !== "default" && typeof react95themes[name as ThemeName] === "object",
);

function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [lastImportTime, setLastImportTime] = useState<number>();
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    hideEmptyConferences: true,
    hideReadMessages: false,
    showMessageThreads: true,
  });
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    current: number;
    total: number;
    percent: number;
  } | null>(null);
  const [themeName, setThemeName] = useState<string>("original");

  useTauriEvent("import-complete", () => {
    setImportProgress(null);
    setLastImportTime(Date.now());
  });

  useTauriEvent("import-progress", (payload) => {
    setImportProgress(
      payload as {
        stage: string;
        current: number;
        total: number;
        percent: number;
      },
    );
  });

  // Set initial zoom to 90%
  useEffect(() => {
    document.body.style.zoom = "90%";
  }, []);

  useEffect(() => {
    getServers();
  }, [lastImportTime]);

  const menu = {
    File: [
      { text: "Import...", action: () => importQWKFileToDB() },
      {
        text: "Quit",
        action: () => {
          handleExitApp();
        },
      },
    ],
    View: [
      {
        checked: viewSettings.hideReadMessages,
        text: "Hide Read Messages",
        action: () => {
          const settings = viewSettings;
          setViewSettings({
            ...settings,
            hideReadMessages: !settings.hideReadMessages,
          });
        },
      },
      {
        checked: viewSettings.showMessageThreads,
        text: "Show Message Threads",
        action: () => {
          const settings = viewSettings;
          setViewSettings({
            ...settings,
            showMessageThreads: !settings.showMessageThreads,
          });
        },
      },
      {
        checked: viewSettings.hideEmptyConferences,
        text: "Hide Empty Conferences",
        action: () => {
          const settings = viewSettings;
          setViewSettings({
            ...settings,
            hideEmptyConferences: !settings.hideEmptyConferences,
          });
        },
      },
    ],
    Theme: themeNames.map((name) => ({
      text: name,
      checked: themeName === name,
      enabled: true,
      action: () => setThemeName(name),
    })),
    Help: [
      {
        text: "About",
        action: () => {
          aboutDialog();
        },
      },
    ],
  };

  async function getServers() {
    try {
      // Call backend to parse the file
      setServers(await invoke<Server[]>("get_servers", {}));
    } catch (err) {
      console.error("Error getting servers:", err);
      alert("Error getting servers: " + err);
    }
  }

  interface ThemesDict {
    [key: string]: Theme;
  }

  const themes: ThemesDict = react95themes;
  const currentTheme: Theme = themes[themeName] ?? original;

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles theme={currentTheme} />
      <TitleBar />
      <Menu data={menu} />
      <div className="window-content">
        {servers.length === 0 ? (
          <BBSWizard importProgress={importProgress} />
        ) : (
          <MainPage
            appSettings={{
              viewSettings,
            }}
            servers={servers}
            importProgress={importProgress}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
