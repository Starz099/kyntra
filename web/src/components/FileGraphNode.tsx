import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FileNode } from "../types/graph";

const SIDE_HANDLE_COUNT = 6;
const sideHandlePercents = Array.from(
  { length: SIDE_HANDLE_COUNT },
  (_, index) => ((index + 1) / (SIDE_HANDLE_COUNT + 1)) * 100,
);

const summarizeWords = (text: string, maxWords: number) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }

  return `${words.slice(0, maxWords).join(" ")}…`;
};

const FileGraphNode = ({ data, selected }: NodeProps<FileNode>) => {
  const shortSummary = summarizeWords(data.summary, 15);

  return (
    <div
      className={`w-84 rounded-xl border bg-zinc-900/90 text-zinc-100 shadow-lg backdrop-blur-sm transition-colors ${
        selected ? "border-blue-400/80" : "border-zinc-700/80"
      }`}
    >
      {sideHandlePercents.map((percent, index) => (
        <Handle
          key={`left-${index}`}
          id={`left-${index}`}
          type="target"
          position={Position.Left}
          className="h-2.5 w-2.5 opacity-0 pointer-events-none"
          style={{ top: `${percent}%` }}
        />
      ))}
      {sideHandlePercents.map((percent, index) => (
        <Handle
          key={`top-${index}`}
          id={`top-${index}`}
          type="target"
          position={Position.Top}
          className="h-2.5 w-2.5 opacity-0 pointer-events-none"
          style={{ left: `${percent}%` }}
        />
      ))}
      <div className="flex items-center justify-between border-b border-zinc-700/80 px-3 py-2">
        <p className="max-w-52 truncate text-xs font-semibold text-zinc-300">
          {data.label}
        </p>
      </div>

      <div className="space-y-3 p-3">
        <p className="truncate text-xs text-zinc-400">{data.fullPath}</p>
        <p className="text-xs leading-relaxed text-zinc-200">{shortSummary}</p>

        <div className="flex flex-wrap gap-1.5">
          {data.symbols.length > 0 ? (
            data.symbols.slice(0, 6).map((symbol) => (
              <span
                key={`${symbol.name}-${symbol.type}`}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300"
                title={symbol.type}
              >
                {symbol.name}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-zinc-500">
              No exported symbols
            </span>
          )}
        </div>
      </div>
      {sideHandlePercents.map((percent, index) => (
        <Handle
          key={`right-${index}`}
          id={`right-${index}`}
          type="source"
          position={Position.Right}
          className="h-2.5 w-2.5 opacity-0 pointer-events-none"
          style={{ top: `${percent}%` }}
        />
      ))}
      {sideHandlePercents.map((percent, index) => (
        <Handle
          key={`bottom-${index}`}
          id={`bottom-${index}`}
          type="source"
          position={Position.Bottom}
          className="h-2.5 w-2.5 opacity-0 pointer-events-none"
          style={{ left: `${percent}%` }}
        />
      ))}
    </div>
  );
};

export default memo(FileGraphNode);
