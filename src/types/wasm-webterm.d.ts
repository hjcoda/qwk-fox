declare module "wasm-webterm" {
  import type { ITerminalAddon } from "xterm";

  export default class WasmWebTerm implements ITerminalAddon {
    activate(terminal: unknown): void;
    dispose(): void;
  }
}
