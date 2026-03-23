import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { message, open } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";

const invoke = tauriInvoke ?? (async () => {
  throw new Error("invoke not available in web mode");
});

export async function aboutDialog() {
  if (!message) {
    console.log("About: QWK Fox");
    return;
  }
  await message(
    `Dedicated to the memory of Mark "Sparky" Herring, the creator of the QWK packet format.
    Fonts by VileR - https://int10h.org/oldschool-pc-fonts/`,
    "About",
  );
}

export async function importQWKFileToDB() {
  if (!open || !invoke) {
    console.log("File import not available in web mode");
    return;
  }
  
  const fileExtensions: string[] = [];
  for (let i = 1; i < 10; i++) {
    fileExtensions.push(`qw${i}`);
  }
  for (let i = 10; i < 100; i++) {
    fileExtensions.push(`q${i}`);
  }

  const selected = await open({
    multiple: false,
    filters: [
      { name: "QWK Files", extensions: ["qwk", "zip", ...fileExtensions] },
    ],
  });
  if (!selected) {
    return;
  }
  const filePath = selected as string;

  try {
    await invoke<null>("import_qwk_file_to_db", {
      filePath,
    });
  } catch (err) {
    console.error("Error loading QWK:", err);
    alert("Error loading QWK: " + err);
  }
}

export async function handleExitApp() {
  if (!exit) {
    console.log("Exit not available in web mode");
    return;
  }
  try {
    await exit();
  } catch (error) {
    console.error("Failed to exit app:", error);
  }
}
