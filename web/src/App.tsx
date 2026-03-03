import { useMemo, useCallback, useEffect, type MouseEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import rawData from "./test-data.json";
import FileGraphNode from "./components/FileGraphNode";
import { useInspectorStore } from "./state/inspector-store";
import {
  normalizeGraphData,
  type FileNode,
  type GraphData,
} from "./types/graph";

const nodeTypes: NodeTypes = {
  fileNode: FileGraphNode,
};

const graphData = normalizeGraphData(rawData as GraphData);

type RelationIndex = {
  incomingByNode: Map<string, string[]>;
  outgoingByNode: Map<string, string[]>;
};

const NODE_SPACING_X = 420;
const NODE_SPACING_Y = 250;
const LAYOUT_SCALE = 1.8;
const LAYOUT_STORAGE_KEY = "kyntra.graph.layout.v1";

type StoredLayout = {
  nodeIds: string[];
  positions: Record<string, { x: number; y: number }>;
};

const findOpenCell = (
  startX: number,
  startY: number,
  occupied: Set<string>,
) => {
  const startKey = `${startX}:${startY}`;
  if (!occupied.has(startKey)) {
    return { x: startX, y: startY };
  }

  for (let radius = 1; radius <= 100; radius++) {
    for (let deltaX = -radius; deltaX <= radius; deltaX++) {
      for (let deltaY = -radius; deltaY <= radius; deltaY++) {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) !== radius) {
          continue;
        }

        const candidateX = startX + deltaX;
        const candidateY = startY + deltaY;
        const key = `${candidateX}:${candidateY}`;
        if (!occupied.has(key)) {
          return { x: candidateX, y: candidateY };
        }
      }
    }
  }

  return { x: startX, y: startY };
};

const spreadOutNodes = (inputNodes: FileNode[]) => {
  if (inputNodes.length <= 1) {
    return inputNodes;
  }

  const minX = Math.min(...inputNodes.map((node) => node.position.x));
  const maxX = Math.max(...inputNodes.map((node) => node.position.x));
  const minY = Math.min(...inputNodes.map((node) => node.position.y));
  const maxY = Math.max(...inputNodes.map((node) => node.position.y));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const occupied = new Set<string>();

  return [...inputNodes]
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map((node) => {
      const scaledX = centerX + (node.position.x - centerX) * LAYOUT_SCALE;
      const scaledY = centerY + (node.position.y - centerY) * LAYOUT_SCALE;

      const desiredCellX = Math.round(scaledX / NODE_SPACING_X);
      const desiredCellY = Math.round(scaledY / NODE_SPACING_Y);
      const openCell = findOpenCell(desiredCellX, desiredCellY, occupied);
      occupied.add(`${openCell.x}:${openCell.y}`);

      return {
        ...node,
        position: {
          x: openCell.x * NODE_SPACING_X,
          y: openCell.y * NODE_SPACING_Y,
        },
      };
    });
};

const restoreNodeLayout = (inputNodes: FileNode[]) => {
  if (typeof window === "undefined") {
    return inputNodes;
  }

  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      return inputNodes;
    }

    const parsed = JSON.parse(raw) as StoredLayout;
    const inputNodeIds = inputNodes.map((node) => node.id).sort();
    const storedNodeIds = Array.isArray(parsed.nodeIds)
      ? [...parsed.nodeIds].sort()
      : [];

    if (
      inputNodeIds.length !== storedNodeIds.length ||
      inputNodeIds.some((id, index) => id !== storedNodeIds[index])
    ) {
      return inputNodes;
    }

    return inputNodes.map((node) => {
      const savedPosition = parsed.positions[node.id];
      if (!savedPosition) {
        return node;
      }

      return {
        ...node,
        position: {
          x: savedPosition.x,
          y: savedPosition.y,
        },
      };
    });
  } catch {
    return inputNodes;
  }
};

const persistNodeLayout = (inputNodes: FileNode[]) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredLayout = {
    nodeIds: inputNodes.map((node) => node.id),
    positions: Object.fromEntries(
      inputNodes.map((node) => [node.id, node.position]),
    ),
  };

  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
};

const buildRelationIndex = (edges: Edge[]): RelationIndex => {
  const incomingByNode = new Map<string, string[]>();
  const outgoingByNode = new Map<string, string[]>();

  for (const edge of edges) {
    const outgoing = outgoingByNode.get(edge.source) ?? [];
    outgoing.push(edge.target);
    outgoingByNode.set(edge.source, outgoing);

    const incoming = incomingByNode.get(edge.target) ?? [];
    incoming.push(edge.source);
    incomingByNode.set(edge.target, incoming);
  }

  return { incomingByNode, outgoingByNode };
};

const InspectorSidebar = ({
  selectedNode,
  incoming,
  outgoing,
}: {
  selectedNode: FileNode | null;
  incoming: string[];
  outgoing: string[];
}) => {
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

const GraphCanvas = () => {
  const selectedNodeId = useInspectorStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useInspectorStore(
    (state) => state.setSelectedNodeId,
  );

  const initialNodes = useMemo(
    () => restoreNodeLayout(spreadOutNodes(graphData.nodes as FileNode[])),
    [],
  );
  const initialEdges = useMemo(
    () =>
      graphData.edges.map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.4, ...edge.style },
      })),
    [],
  );

  const [nodes, , onNodesChange] = useNodesState<FileNode>(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      persistNodeLayout(nodes);
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [nodes]);

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const relationIndex = useMemo(() => buildRelationIndex(edges), [edges]);

  const selectedNode = selectedNodeId
    ? (nodeById.get(selectedNodeId) ?? null)
    : null;
  const incoming = selectedNodeId
    ? (relationIndex.incomingByNode.get(selectedNodeId) ?? [])
    : [];
  const outgoing = selectedNodeId
    ? (relationIndex.outgoingByNode.get(selectedNodeId) ?? [])
    : [];

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: FileNode) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      <div className="relative h-full flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2.4}
          nodesDraggable
          snapToGrid
          snapGrid={[20, 20]}
          onlyRenderVisibleElements
          elevateEdgesOnSelect
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: true, type: "smoothstep" }}
        >
          <Background gap={24} size={1} />
          <MiniMap pannable zoomable className="!bg-zinc-900/80" />
          <Controls className="!bg-zinc-900/90 [&>button]:!bg-zinc-800 [&>button]:!text-zinc-100" />
          <Panel
            position="top-left"
            className="rounded-md border border-zinc-800 bg-zinc-900/85 px-3 py-2 text-xs text-zinc-300"
          >
            {nodes.length} files · {edges.length} imports
          </Panel>
        </ReactFlow>
      </div>

      <InspectorSidebar
        selectedNode={selectedNode}
        incoming={incoming}
        outgoing={outgoing}
      />
    </div>
  );
};

const App = () => {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  );
};

export default App;
