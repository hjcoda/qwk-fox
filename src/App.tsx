import { invoke } from "@tauri-apps/api/core";
import { Menu, Submenu } from "@tauri-apps/api/menu";
import { message, open } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";

import "./App.css";

import { Server } from "./data/DTO";

import { ThemeProvider } from "styled-components";
import { useTauriEvent } from "./hooks/useTauriEvent";
import { BBSWizard } from "./pages/BBSWizard";
import { MainPage } from "./pages/MainPage";

// pick a theme of your choice
import * as themes from "react95/dist/themes";
import original from "react95/dist/themes/original";

import { ViewSettings } from "./AppSettings";
import { GlobalStyles } from "./GlobalStyles";
import { Theme } from "react95/dist/common/themes/types";

const macOS = navigator.userAgent.includes("Macintosh");

interface MenuActions {
  importQWKFileToDB: () => void;
  viewSettings: () => ViewSettings;
  updateViewSettings: (viewSettings: ViewSettings) => void;
  themeName: () => string;
  updateTheme: (themeName: string) => void;
  aboutDialog: () => void;
}

type ThemeName = Exclude<keyof typeof themes, "default">;

const themeNames = Object.keys(themes).filter(
  (name) => name !== "default" && typeof themes[name as ThemeName] === "object",
);

async function create({
  importQWKFileToDB,
  viewSettings,
  updateViewSettings,
  themeName,
  updateTheme,
  aboutDialog,
}: MenuActions) {
  const fileMenu = await Submenu.new({
    text: "File",
    items: [
      {
        text: "Import...",
        enabled: true,
        action: () => {
          importQWKFileToDB();
        },
      },
      {
        text: "Quit",
        enabled: true,
        action: () => {
          exit(0);
        },
      },
    ],
  });
  const viewMenu = await Submenu.new({
    text: "View",
    items: [
      {
        checked: viewSettings().hideReadMessages,
        text: "Hide Read Messages",
        enabled: true,
        action: () => {
          const settings = viewSettings();
          updateViewSettings({
            ...settings,
            hideReadMessages: !settings.hideReadMessages,
          });
        },
      },
      {
        checked: viewSettings().showMessageThreads,
        text: "Show Message Threads",
        enabled: true,
        action: () => {
          const settings = viewSettings();
          updateViewSettings({
            ...settings,
            showMessageThreads: !settings.showMessageThreads,
          });
        },
      },
      {
        checked: viewSettings().hideEmptyConferences,
        text: "Hide Empty Conferences",
        enabled: true,
        action: () => {
          const settings = viewSettings();
          updateViewSettings({
            ...settings,
            hideEmptyConferences: !settings.hideEmptyConferences,
          });
        },
      },
      {
        text: "Theme",
        items: themeNames.map((name) => ({
          text: name,
          checked: themeName() === name,
          enabled: true,
          action: () => updateTheme(name),
        })),
      },
    ],
  });
  const helpMenu = await Submenu.new({
    text: "Help",
    items: [
      {
        text: "About",
        enabled: true,
        action: () => {
          aboutDialog();
        },
      },
    ],
  });

  const menu = await Menu.new({
    items: [fileMenu, viewMenu, helpMenu],
  });
  await (macOS ? menu.setAsAppMenu() : menu.setAsWindowMenu());
}

function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [lastImportTime, setLastImportTime] = useState<number>();
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    hideEmptyConferences: false,
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

  async function getServers() {
    try {
      // Call backend to parse the file
      setServers(await invoke<Server[]>("get_servers", {}));
    } catch (err) {
      console.error("Error getting servers:", err);
      alert("Error getting servers: " + err);
    }
  }

  useEffect(() => {
    create({
      importQWKFileToDB: () => importQWKFileToDB(),
      viewSettings: () => viewSettings,
      updateViewSettings: (viewSettings: ViewSettings) =>
        setViewSettings(viewSettings),
      themeName: () => themeName,
      updateTheme: (themeName: string) => setThemeName(themeName),
      aboutDialog: () => aboutDialog(),
    });
  }, [viewSettings, themeName]);

  async function importQWKFileToDB() {
    const fileExtensions = [];
    for (let i = 1; i < 10; i++) {
      fileExtensions.push(`qw${i}`);
    }
    for (let i = 10; i < 100; i++) {
      fileExtensions.push(`q${i}`);
    }

    // Use frontend dialog API to pick file (non-blocking)
    const selected = await open({
      multiple: false,
      filters: [
        { name: "QWK Files", extensions: ["qwk", "zip", ...fileExtensions] },
      ],
    });
    if (!selected) {
      return; // User cancelled
    }
    const filePath = selected as string;

    try {
      // Call backend to parse the file
      await invoke<null>("import_qwk_file_to_db", {
        filePath,
      });
    } catch (err) {
      console.error("Error loading QWK:", err);
      alert("Error loading QWK: " + err);
    }
  }

  async function aboutDialog() {
    // Use frontend dialog API to pick file (non-blocking)
    await message(
      'Dedicated to the memory of Mark "Sparky" Herring, the creator of the QWK packet format.',
      "About",
    );
  }

  const currentTheme: Theme =
    (themes as Record<string, Theme>)[themeName] ?? original;
  return (
    <ThemeProvider theme={currentTheme}>
      <main>
        <GlobalStyles theme={currentTheme} />
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
      </main>
    </ThemeProvider>
  );
}

export default App;
