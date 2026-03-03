import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FileNode } from "../types/graph";

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
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !bg-blue-400"
      />
      <div className="flex items-center justify-between border-b border-zinc-700/80 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
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
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !bg-blue-400"
      />
    </div>
  );
};

export default memo(FileGraphNode);
