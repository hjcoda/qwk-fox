import { invoke } from "@tauri-apps/api/core";
import { message, open } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";

export async function aboutDialog() {
  // Use frontend dialog API to pick file (non-blocking)
  await message(
    'Dedicated to the memory of Mark "Sparky" Herring, the creator of the QWK packet format.',
    "About",
  );
}

export async function importQWKFileToDB() {
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

export async function handleExitApp() {
  try {
    // Exits the application with a default code of 0
    await exit();
    // Optionally, you can provide an exit code
    // await exit(1);
  } catch (error) {
    console.error("Failed to exit app:", error);
  }
}
