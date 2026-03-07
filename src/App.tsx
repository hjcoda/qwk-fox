import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, message } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { Menu, Submenu } from "@tauri-apps/api/menu";

import "./App.css";

import { Server } from "./data/DTO";

import { useTauriEvent } from "./hooks/useTauriEvent";
import { MainPage } from "./pages/MainPage";
import { BBSWizard } from "./pages/BBSWizard";
import { createGlobalStyle, ThemeProvider } from "styled-components";

import { styleReset } from "react95";
// pick a theme of your choice
import original from "react95/dist/themes/original";
// original Windows95 font (optionally)
import ms_sans_serif from "react95/dist/fonts/ms_sans_serif.woff2";
import ms_sans_serif_bold from "react95/dist/fonts/ms_sans_serif_bold.woff2";

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif}') format('woff2');
    font-weight: 400;
    font-style: normal
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif_bold}') format('woff2');
    font-weight: bold;
    font-style: normal
  }
  body {
    font-family: 'ms_sans_serif';
  }
`;

const macOS = navigator.userAgent.includes("Macintosh");

interface MenuActions {
  isHideReadEnabled: () => boolean;
  importQWKFileToDB: () => void;
  toggleHideRead: () => void;
  aboutDialog: () => void;
}

async function create({
  isHideReadEnabled,
  importQWKFileToDB,
  toggleHideRead,
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
        checked: isHideReadEnabled(),
        text: "Hide Read",
        enabled: true,
        action: () => {
          toggleHideRead();
        },
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
  const [hideRead, setHideRead] = useState<boolean>(false);

  useTauriEvent("import-complete", () => {
    setLastImportTime(Date.now());
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
      isHideReadEnabled: () => hideRead,
      importQWKFileToDB: () => importQWKFileToDB(),
      toggleHideRead: () => setHideRead(!hideRead),
      aboutDialog: () => aboutDialog(),
    });
  }, [hideRead]);

  async function importQWKFileToDB() {
    // Use frontend dialog API to pick file (non-blocking)
    const selected = await open({
      multiple: false,
      filters: [{ name: "QWK Files", extensions: ["qwk", "zip"] }],
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

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <GlobalStyles />
      <ThemeProvider theme={original}>
        <div>
          {servers.length === 0 ? (
            <BBSWizard />
          ) : (
            <MainPage
              appSettings={{
                hideRead,
              }}
              servers={servers}
            />
          )}
        </div>
      </ThemeProvider>
    </main>
  );
}

export default App;
