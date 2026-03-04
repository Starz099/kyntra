import { Panel, useReactFlow } from "@xyflow/react";
import {
  IconHandStop,
  IconMaximize,
  IconMinus,
  IconPlus,
  IconPointer,
} from "@tabler/icons-react";

type InteractionMode = "drag" | "select";

type GraphControlStackProps = {
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
};

const GraphControlStack = ({
  interactionMode,
  setInteractionMode,
}: GraphControlStackProps) => {
  const reactFlow = useReactFlow();

  return (
    <Panel
      position="bottom-left"
      style={{ marginBottom: 16 }}
      className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/90 shadow"
    >
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setInteractionMode("drag")}
          className={`flex h-8 w-8 items-center justify-center transition-colors ${
            interactionMode === "drag"
              ? "bg-zinc-800 text-zinc-50"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
          title="Drag mode (2)"
        >
          <IconHandStop size={15} stroke={1.8} />
        </button>
        <button
          type="button"
          onClick={() => setInteractionMode("select")}
          className={`border-t border-zinc-800 flex h-8 w-8 items-center justify-center transition-colors ${
            interactionMode === "select"
              ? "bg-zinc-800 text-zinc-50"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
          title="Selection mode (1)"
        >
          <IconPointer size={15} stroke={1.8} />
        </button>
        <button
          type="button"
          onClick={() => {
            void reactFlow.zoomIn();
          }}
          className="border-t border-zinc-800 flex h-8 w-8 items-center justify-center bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800"
          title="Zoom in"
        >
          <IconPlus size={15} stroke={1.8} />
        </button>
        <button
          type="button"
          onClick={() => {
            void reactFlow.zoomOut();
          }}
          className="border-t border-zinc-800 flex h-8 w-8 items-center justify-center bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800"
          title="Zoom out"
        >
          <IconMinus size={15} stroke={1.8} />
        </button>
        <button
          type="button"
          onClick={() => {
            void reactFlow.fitView({ padding: 0.2 });
          }}
          className="border-t border-zinc-800 flex h-8 w-8 items-center justify-center bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800"
          title="Fit view"
        >
          <IconMaximize size={15} stroke={1.8} />
        </button>
      </div>
    </Panel>
  );
};

export default GraphControlStack;
