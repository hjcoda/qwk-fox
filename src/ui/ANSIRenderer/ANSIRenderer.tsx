import React, { useEffect, useMemo, useRef, useState } from "react";

type AnsiCell = {
  text: string;
  style: React.CSSProperties;
};

type ANSIRendererProps = {
  text: string;
  columns?: number;
  rows?: number;
  className?: string;
};

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 200;

const ANSI_COLOR_MAP: Record<number, string> = {
  30: "#000000",
  31: "#a00000",
  32: "#00a000",
  33: "#a0a000",
  34: "#0000a0",
  35: "#a000a0",
  36: "#00a0a0",
  37: "#ffffff",
  90: "#555555",
  91: "#ff5555",
  92: "#55ff55",
  93: "#ffff55",
  94: "#5555ff",
  95: "#ff55ff",
  96: "#55ffff",
  97: "#ffffff",
};

const ANSI_BG_MAP: Record<number, string> = {
  40: "#000000",
  41: "#a00000",
  42: "#00a000",
  43: "#a0a000",
  44: "#0000a0",
  45: "#a000a0",
  46: "#00a0a0",
  47: "#ffffff",
  100: "#555555",
  101: "#ff5555",
  102: "#55ff55",
  103: "#ffff55",
  104: "#5555ff",
  105: "#ff55ff",
  106: "#55ffff",
  107: "#ffffff",
};

const createEmptyRow = (cols: number) =>
  Array.from({ length: cols }, () => ({ text: " ", style: {} }));

const getRow = (
  grid: Array<AnsiCell[] | null>,
  rowIndex: number,
  cols: number,
) => {
  if (!grid[rowIndex]) {
    grid[rowIndex] = createEmptyRow(cols);
  }
  return grid[rowIndex] as AnsiCell[];
};

const stylesEqual = (a: React.CSSProperties, b: React.CSSProperties) =>
  a.color === b.color &&
  a.backgroundColor === b.backgroundColor &&
  a.fontWeight === b.fontWeight &&
  a.fontStyle === b.fontStyle &&
  a.textDecoration === b.textDecoration;

type ParsedAnsi = {
  grid: Array<AnsiCell[] | null>;
  maxRow: number;
};

const parseAnsi = (input: string, cols: number, rows: number): ParsedAnsi => {
  const grid: Array<AnsiCell[] | null> = Array.from(
    { length: rows },
    () => null,
  );
  let row = 0;
  let col = 0;
  let currentStyle: React.CSSProperties = {};
  let maxRow = 0;

  const actualAnsi = input.replace(/←/g, "\x1b");
  const ansiRegex = /\x1b\[([0-9;]*)([A-Za-z])|([\r\n])|([^\x1b\r\n]+)/g;
  let match: RegExpExecArray | null;

  const placeChar = (char: string) => {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return;
    }
    const rowCells = getRow(grid, row, cols);
    rowCells[col] = { text: char, style: { ...currentStyle } };
    col += 1;
    if (col >= cols) {
      col = 0;
      row = Math.min(row + 1, rows - 1);
      maxRow = Math.max(maxRow, row);
    }
  };

  while ((match = ansiRegex.exec(actualAnsi)) !== null) {
    if (match[3]) {
      if (match[3] === "\r") {
        col = 0;
      } else {
        row = Math.min(row + 1, rows - 1);
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
          row = Math.min(row + 1, rows - 1);
          col = 0;
          maxRow = Math.max(maxRow, row);
        } else {
          placeChar(char);
        }
      }
      continue;
    }

    if (match[1] !== undefined && match[2]) {
      const command = match[2];
      const params = match[1]
        .split(";")
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10));
      const param = params[0] ?? 1;

      if (command === "m") {
        if (params.length === 0 || params.includes(0)) {
          currentStyle = {};
        }
        params.forEach((code) => {
          if (code === 1) currentStyle.fontWeight = "bold";
          if (code === 3) currentStyle.fontStyle = "italic";
          if (code === 4) currentStyle.textDecoration = "underline";
          if (ANSI_COLOR_MAP[code]) currentStyle.color = ANSI_COLOR_MAP[code];
          if (ANSI_BG_MAP[code])
            currentStyle.backgroundColor = ANSI_BG_MAP[code];
          if (code === 39) currentStyle.color = undefined;
          if (code === 49) currentStyle.backgroundColor = undefined;
        });
        continue;
      }

      switch (command) {
        case "A":
          row = Math.max(row - param, 0);
          break;
        case "B":
          row = Math.min(row + param, rows - 1);
          maxRow = Math.max(maxRow, row);
          break;
        case "C":
          col = Math.min(col + param, cols - 1);
          break;
        case "D":
          col = Math.max(col - param, 0);
          break;
        case "G":
          col = Math.min(Math.max(param - 1, 0), cols - 1);
          break;
        case "H":
        case "f": {
          const targetRow = (params[0] ?? 1) - 1;
          const targetCol = (params[1] ?? 1) - 1;
          row = Math.min(Math.max(targetRow, 0), rows - 1);
          col = Math.min(Math.max(targetCol, 0), cols - 1);
          maxRow = Math.max(maxRow, row);
          break;
        }
        case "J":
          if (param === 2) {
            for (let r = 0; r < rows; r++) {
              grid[r] = null;
            }
            row = 0;
            col = 0;
          }
          break;
        default:
          break;
      }
    }
  }

  return { grid, maxRow };
};

const condenseRow = (row: AnsiCell[] | null) => {
  if (!row) {
    return [] as AnsiCell[];
  }
  const segments: AnsiCell[] = [];
  let current: AnsiCell | null = null;
  let lastNonSpaceIndex = -1;

  row.forEach((cell, index) => {
    if (cell.text !== " ") {
      lastNonSpaceIndex = index;
    }
  });

  const trimmedRow =
    lastNonSpaceIndex >= 0 ? row.slice(0, lastNonSpaceIndex + 1) : [];

  trimmedRow.forEach((cell) => {
    if (!current) {
      current = { ...cell };
      return;
    }

    const styleMatch = stylesEqual(current.style, cell.style);
    if (!styleMatch) {
      segments.push(current);
      current = { ...cell };
      return;
    }

    current.text += cell.text;
  });

  if (current) {
    segments.push(current);
  }

  return segments;
};

export const ANSIRenderer = ({
  text,
  columns = DEFAULT_COLUMNS,
  rows = DEFAULT_ROWS,
  className,
}: ANSIRendererProps): React.ReactElement => {
  const { grid, maxRow } = useMemo(
    () => parseAnsi(text, columns, rows),
    [text, columns, rows],
  );
  const visibleRows = grid.slice(0, Math.min(maxRow + 1, grid.length));
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [computedLineHeight, setComputedLineHeight] = useState(19);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const sample = document.createElement("span");
    sample.textContent = "M";
    sample.style.visibility = "hidden";
    sample.style.position = "absolute";
    container.appendChild(sample);
    const height = sample.getBoundingClientRect().height;
    container.removeChild(sample);
    if (height > 0) {
      setComputedLineHeight(height);
    }
  }, [columns, rows, text]);

  const lineHeight = computedLineHeight;
  const totalHeight = visibleRows.length * lineHeight;

  return (
    <div className={className} ref={containerRef} style={{ overflow: "auto" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleRows.map((row, index) => {
          const segments = condenseRow(row);
          return (
            <div key={index} style={{ height: lineHeight }}>
              {segments.map((segment, segmentIndex) => (
                <span key={segmentIndex} style={segment.style}>
                  {segment.text}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
