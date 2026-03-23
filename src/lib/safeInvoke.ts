import * as tauriCore from "@tauri-apps/api/core";

const invoke = tauriCore.invoke ?? (async () => {
  console.warn("invoke not available in web mode");
  return null;
});

const convertFileSrc = tauriCore.convertFileSrc ?? ((path: string) => `/${path}`);

export { invoke, convertFileSrc };
