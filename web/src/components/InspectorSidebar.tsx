import type { FileNode } from "../types/graph";

type InspectorSidebarProps = {
  selectedNode: FileNode | null;
  incoming: string[];
  outgoing: string[];
};

const InspectorSidebar = ({
  selectedNode,
  incoming,
  outgoing,
}: InspectorSidebarProps) => {
  if (!selectedNode) {
    return (
      <aside className="h-full w-[340px] border-l border-zinc-800 bg-zinc-950/95 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Inspector</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Select a file node to inspect symbols, summary, and import metadata.
        </p>
      </aside>
    );
  }

  return (
    <aside className="h-full w-[340px] overflow-y-auto border-l border-zinc-800 bg-zinc-950/95 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Inspector</h2>
      <p className="mt-2 text-xs text-zinc-500">{selectedNode.data.fullPath}</p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-200">
        {selectedNode.data.summary}
      </p>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Exported symbols
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
          {selectedNode.data.symbols.length > 0 ? (
            selectedNode.data.symbols.map((symbol) => (
              <li
                key={`${symbol.name}-${symbol.type}`}
                className="flex items-center justify-between rounded-md bg-zinc-900 px-2 py-1"
              >
                <span>{symbol.name}</span>
                <span className="text-xs uppercase text-zinc-500">
                  {symbol.type}
                </span>
              </li>
            ))
          ) : (
            <li className="text-zinc-500">No exported symbols</li>
          )}
        </ul>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Incoming
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">
            {incoming.length}
          </p>
        </div>
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Outgoing
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">
            {outgoing.length}
          </p>
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Imports from this file
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-zinc-300">
          {outgoing.length > 0 ? (
            outgoing.map((item) => (
              <li key={item} className="truncate rounded bg-zinc-900 px-2 py-1">
                {item}
              </li>
            ))
          ) : (
            <li className="text-zinc-500">No outgoing imports</li>
          )}
        </ul>
      </section>
    </aside>
  );
};

export default InspectorSidebar;
