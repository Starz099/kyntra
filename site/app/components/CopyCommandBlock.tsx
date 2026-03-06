"use client";

import { useState } from "react";

type CopyCommandBlockProps = {
  command: string;
  description?: string;
};

export default function CopyCommandBlock({
  command,
  description,
}: CopyCommandBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copyCommand}
      className="dotted-secondary block w-full border bg-white p-3 text-left transition cursor-pointer hover:bg-slate-50"
      title="Click to copy"
    >
      <div className="flex items-start justify-between gap-3 ">
        <code className="font-mono text-sm text-slate-900">{command}</code>
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
          {copied ? "copied" : "click to copy"}
        </span>
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
      ) : null}
    </button>
  );
}
