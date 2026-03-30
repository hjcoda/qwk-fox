import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
import { AboutWindow } from "./features/windows/AboutWindow.tsx";
import { PreferencesWindow } from "./features/windows/PreferencesWindow.tsx";
import { GlobalStyles } from "./GlobalStyles";
import { handleExitApp, importQWKFileToDB } from "./interop/Interop";

import "./App.scss";
import { StyledWindow } from "./ui/StyledWindow/StyledWindow.tsx";

export const themeNames = Object.keys(react95themes).filter(
  (name) => name !== "default",
);

export const themeMap = react95themes as Record<string, Theme>;
export const FONT_STORAGE_KEY = "qwk-fox.message-font";
export const FONT_SIZE_STORAGE_KEY = "qwk-fox.message-font-size";
export const LOCALE_STORAGE_KEY = "qwk-fox.locale";

function App() {
  const getInitialThemeName = (): string => {
    const stored = localStorage.getItem("qwk-fox.theme");
    return stored ?? "original";
  };
  const [servers, setServers] = useState<Server[]>([]);
  const [lastImportTime, setLastImportTime] = useState<number>();
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    hideEmptyConferences: true,
    hideReadMessages: false,
    showMessageThreads: true,
    constrainMessageColumns: true,
  });
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    current: number;
    total: number;
    percent: number;
  } | null>(null);
  const [themeName, setThemeName] = useState<string>(getInitialThemeName);
  const windowType = new URL(window.location.href).searchParams.get("window");
  const isPreferencesWindow = windowType === "preferences";
  const isAboutWindow = windowType === "about";

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

  useEffect(() => {
    if (isPreferencesWindow || isAboutWindow) {
      return;
    }

    const unlistenPromise = getCurrentWindow().onCloseRequested(async () => {
      const preferencesWindow = await WebviewWindow.getByLabel("preferences");
      if (preferencesWindow) {
        await preferencesWindow.hide();
      }
      const aboutWindow = await WebviewWindow.getByLabel("about");
      if (aboutWindow) {
        await aboutWindow.hide();
      }
      handleExitApp();
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isPreferencesWindow]);

  useEffect(() => {
    if (isPreferencesWindow || isAboutWindow) {
      return;
    }

    const baseUrl = new URL(window.location.href);
    const createOrShow = (label: string, width: number, height: number) => {
      WebviewWindow.getByLabel(label).then((existing) => {
        if (existing) {
          return;
        }
        const url = new URL(baseUrl.toString());
        url.searchParams.set("window", label);
        const windowRef = new WebviewWindow(label, {
          title: label === "preferences" ? "Preferences" : "About QWK Fox",
          url: url.toString(),
          width,
          height,
          resizable: false,
          decorations: false,
          visible: false,
        });
        windowRef.once("tauri://error", (event) => {
          console.error(`Failed to precreate ${label} window`, event);
        });
        windowRef.onCloseRequested(async (event) => {
          event.preventDefault();
          await windowRef.hide();
        });
      });
    };

    createOrShow("preferences", 640, 400);
    createOrShow("about", 480, 320);
  }, [isPreferencesWindow, isAboutWindow]);

  useEffect(() => {
    if (isPreferencesWindow || isAboutWindow) {
      return;
    }

    import("./features/windows/PreferencesWindow.tsx");
    import("./features/windows/AboutWindow.tsx");
  }, [isPreferencesWindow, isAboutWindow]);

  useEffect(() => {
    localStorage.setItem("qwk-fox.theme", themeName);
  }, [themeName]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "qwk-fox.theme" && event.newValue) {
        setThemeName(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const currentTheme: Theme = themeMap[themeName] ?? original;

  const menu = {
    File: [
      { text: "Import...", action: () => importQWKFileToDB() },
      {
        text: "Preferences...",
        action: () => {
          WebviewWindow.getByLabel("preferences").then((existing) => {
            if (existing) {
              existing.show();
              existing.setFocus();
              return;
            }
          });
        },
      },
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
      {
        checked: viewSettings.constrainMessageColumns,
        text: "Column Limit",
        action: () => {
          const settings = viewSettings;
          setViewSettings({
            ...settings,
            constrainMessageColumns: !settings.constrainMessageColumns,
          });
        },
      },
    ],
    Help: [
      {
        text: "About",
        action: () => {
          WebviewWindow.getByLabel("about").then((existing) => {
            if (existing) {
              existing.show();
              existing.setFocus();
              return;
            }
          });
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

  const content = () => {
    if (isPreferencesWindow) return <PreferencesWindow />;
    if (isAboutWindow) return <AboutWindow />;
    return (
      <StyledWindow title="QWK Fox" menuData={menu}>
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
      </StyledWindow>
    );
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles theme={currentTheme} />
      {content()}
    </ThemeProvider>
  );
}

export default App;
