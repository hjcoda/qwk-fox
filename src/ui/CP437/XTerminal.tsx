import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import WasmWebTerm from "wasm-webterm";
import "xterm/css/xterm.css";

const DEFAULT_FONT_SIZE = 14;
const LINE_HEIGHT = 1.0;
const PADDING = 8;
const DOS_FONT_STACK = '"IBMVGA8", monospace';
const TERMINAL_BG = "#1e1e1e";

type WasmWebTermLike = {
  activate: (terminal: Terminal) => void;
  dispose: () => void;
  repl?: () => void;
  _onXtermData?: (data: string) => void;
  printWelcomeMessagePlusControlSequences?: () => Promise<string> | string;
};

const countAnsiRows = (input: string, columns?: number): number => {
  let row = 0;
  let col = 0;
  let maxRow = 0;

  const text = input.replace(/←/g, "\x1b");

  const ansiRegex = /\x1b\[([0-9;]*)([A-Za-z])|([\r\n])|([^\x1b\r\n]+)/g;
  let match;

  while ((match = ansiRegex.exec(text)) !== null) {
    if (match[3]) {
      if (match[3] === "\r") {
        col = 0;
      } else {
        row += 1;
        col = 0;
        maxRow = Math.max(maxRow, row);
      }
      continue;
    }

    if (match[4]) {
      for (const char of match[4]) {
        if (char === "\r") {
          col = 0;
        } else if (char === "\n") {
          row += 1;
          col = 0;
          maxRow = Math.max(maxRow, row);
        } else {
          col += 1;
          if (columns && col >= columns) {
            row += 1;
            col = 0;
            maxRow = Math.max(maxRow, row);
          }
        }
      }
      continue;
    }

    if (match[1] !== undefined && match[2]) {
      const params = match[1]
        .split(";")
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10));
      const command = match[2];
      const param = params[0] ?? 1;

      switch (command) {
        case "A":
          row = Math.max(row - param, 0);
          break;
        case "B":
          row += param;
          maxRow = Math.max(maxRow, row);
          break;
        case "C":
          col += param;
          if (columns && col >= columns) {
            row += Math.floor(col / columns);
            col = col % columns;
            maxRow = Math.max(maxRow, row);
          }
          break;
        case "D":
          col = Math.max(col - param, 0);
          break;
        case "G":
          col = Math.max(param - 1, 0);
          if (columns) {
            col = Math.min(col, Math.max(columns - 1, 0));
          }
          break;
        case "H":
        case "f": {
          const nextRow = (params[0] ?? 1) - 1;
          const nextCol = (params[1] ?? 1) - 1;
          row = Math.max(nextRow, 0);
          col = Math.max(nextCol, 0);
          if (columns) {
            col = Math.min(col, Math.max(columns - 1, 0));
          }
          maxRow = Math.max(maxRow, row);
          break;
        }
        case "J":
          if (param === 2) {
            row = 0;
            col = 0;
          }
          break;
        default:
          break;
      }
    }
  }

  const totalRows = Math.max(maxRow + 1, row + 1, 1);
  return totalRows;
};

export function XTerminalWithUnicode({
  text,
  fontSize = DEFAULT_FONT_SIZE,
  columns,
  autoHeight = true,
  onWheel,
}: {
  text: string;
  fontSize?: number;
  columns?: number;
  autoHeight?: boolean;
  onWheel?: (event: WheelEvent) => void;
}): React.ReactElement {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wasmAddonRef = useRef<InstanceType<typeof WasmWebTerm> | null>(null);
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null);
  const [resolvedBackground, setResolvedBackground] =
    React.useState<string>(TERMINAL_BG);
  const rows = countAnsiRows(text, columns);
  const height = autoHeight
    ? measuredHeight ?? rows * fontSize * LINE_HEIGHT + PADDING * 2
    : undefined;

  const resolveBackground = () => {
    const container = terminalRef.current;
    if (!container) {
      return TERMINAL_BG;
    }
    const host = container.closest(".message-box-container");
    if (!host) {
      return TERMINAL_BG;
    }
    const computed = getComputedStyle(host);
    return (
      computed.getPropertyValue("--messagebox-terminal-bg").trim() || TERMINAL_BG
    );
  };

  useEffect(() => {
    if (!terminalRef.current || terminalInstanceRef.current) {
      return;
    }

    const term = new Terminal({
      theme: {
        background: resolveBackground(),
        foreground: "#f8f8f2",
      },
      fontFamily: DOS_FONT_STACK,
      fontSize,
      lineHeight: LINE_HEIGHT,
      cols: columns,
      cursorBlink: false,
      cursorStyle: "block",
      cursorWidth: 0,
      convertEol: true,
      scrollback: 0,
      allowProposedApi: true,
      windowsMode: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const wasmAddon = new WasmWebTerm() as WasmWebTermLike;
    term.loadAddon(wasmAddon);
    wasmAddonRef.current = wasmAddon;
    wasmAddon.repl = () => undefined;
    wasmAddon._onXtermData = () => undefined;
    wasmAddon.printWelcomeMessagePlusControlSequences = () => "";

    term.open(terminalRef.current);
    if (onWheel && term.element) {
      term.element.addEventListener("wheel", onWheel, {
        passive: false,
      });
    }
    const fitAfterFonts = async () => {
      const background = resolveBackground();
      setResolvedBackground(background);
      term.options.theme = {
        background,
        foreground: "#f8f8f2",
      };
      if (document.fonts?.load) {
        try {
          await document.fonts.load(`${fontSize}px ${DOS_FONT_STACK}`);
        } catch (err) {
          // Ignore font load issues and fit anyway.
        }
      } else if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch (err) {
          // Ignore font load issues and fit anyway.
        }
      }
      if (!autoHeight) {
        fitAddon.fit();
        if (columns) {
          term.resize(columns, term.rows);
        }
      }
    };

    fitAfterFonts();

    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      if (!autoHeight) {
        fitAddon.fit();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (onWheel && term.element) {
        term.element.removeEventListener("wheel", onWheel as EventListener);
      }
      wasmAddonRef.current?.dispose();
      term.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
      wasmAddonRef.current = null;
    };
  }, [fontSize, columns, autoHeight, onWheel]);

  useEffect(() => {
    const term = terminalInstanceRef.current;
    if (!term) {
      return;
    }

    const processed = text.replace(/←/g, "\x1b");
    term.options.fontSize = fontSize;
    term.options.lineHeight = LINE_HEIGHT;
    term.reset();
    term.clear();
    term.write("\x1b[H");
    const targetCols = columns ?? term.cols;
    if (autoHeight) {
      term.resize(targetCols, rows);
    } else if (columns) {
      term.resize(targetCols, term.rows);
    }
    term.write(processed);
    const fitOnUpdate = async () => {
      const background = resolveBackground();
      setResolvedBackground(background);
      term.options.theme = {
        background,
        foreground: "#f8f8f2",
      };
      if (document.fonts?.load) {
        try {
          await document.fonts.load(`${fontSize}px ${DOS_FONT_STACK}`);
        } catch (err) {
          // Ignore font load issues and fit anyway.
        }
      } else if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch (err) {
          // Ignore font load issues and fit anyway.
        }
      }
      if (autoHeight) {
        const dimensions = (term as any)?._core?._renderService?.dimensions;
        const actualCellHeight =
          dimensions?.actualCellHeight as number | undefined;
        if (actualCellHeight) {
          setMeasuredHeight(actualCellHeight * rows + PADDING * 2);
        }
      }

    };
    fitOnUpdate();
  }, [text, rows, fontSize, columns, autoHeight, measuredHeight]);

  return (
    <div
      ref={terminalRef}
      style={{
        height: autoHeight && height ? `${height}px` : "100%",
        minHeight: autoHeight && height ? `${height}px` : undefined,
        width: "100%",
        backgroundColor: resolvedBackground,
        padding: 0,
        fontFamily: DOS_FONT_STACK,
      }}
    />
  );
}
