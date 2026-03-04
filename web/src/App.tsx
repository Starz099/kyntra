import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import FileGraphNode from "./components/FileGraphNode";
import GraphControlStack from "./components/GraphControlStack";
import InspectorSidebar from "./components/InspectorSidebar";
import {
  DEFAULT_LAYOUT_SETTINGS,
  buildRelationIndex,
  buildStyledEdges,
  persistNodeLayout,
  restoreNodeLayout,
  spreadOutNodes,
} from "./graph/layout";
import { useInteractionMode } from "./hooks/useInteractionMode";
import { useInspectorStore } from "./state/inspector-store";
import {
  normalizeGraphData,
  type FileNode,
  type GraphData,
} from "./types/graph";

const nodeTypes: NodeTypes = {
  fileNode: FileGraphNode,
};

const GraphCanvas = ({ graphData }: { graphData: GraphData }) => {
  const selectedNodeId = useInspectorStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useInspectorStore(
    (state) => state.setSelectedNodeId,
  );
  const { interactionMode, setInteractionMode } = useInteractionMode();
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  const initialNodes = useMemo(
    () =>
      restoreNodeLayout(
        spreadOutNodes(
          graphData.nodes as FileNode[],
          graphData.edges,
          DEFAULT_LAYOUT_SETTINGS,
        ),
      ),
    [graphData.nodes, graphData.edges],
  );

  const initialEdges = useMemo(
    () =>
      buildStyledEdges(graphData.edges, initialNodes, DEFAULT_LAYOUT_SETTINGS),
    [graphData.edges, initialNodes],
  );

  const [nodes, , onNodesChange] = useNodesState<FileNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const syncEdgesAndPersistLayout = useCallback(
    (inputNodes: FileNode[]) => {
      setEdges(
        buildStyledEdges(graphData.edges, inputNodes, DEFAULT_LAYOUT_SETTINGS),
      );
      persistNodeLayout(inputNodes);
    },
    [graphData.edges, setEdges],
  );

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

  const handleNodeDragStop = useCallback(() => {
    setIsDraggingNode(false);
    syncEdgesAndPersistLayout(nodes);
  }, [nodes, syncEdgesAndPersistLayout]);

  const handleNodeDragStart = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      <div className="relative h-full flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2.4}
          nodesDraggable
          selectionOnDrag={interactionMode === "select"}
          selectionMode={SelectionMode.Partial}
          selectionKeyCode="Shift"
          panOnDrag={interactionMode === "drag" ? true : [2]}
          snapToGrid={false}
          snapGrid={[20, 20]}
          onlyRenderVisibleElements
          elevateEdgesOnSelect
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: false, type: "smoothstep" }}
        >
          <Background gap={24} size={1} />
          {!isDraggingNode ? (
            <MiniMap pannable zoomable className="bg-zinc-900/80!" />
          ) : null}
          <Panel
            position="top-left"
            className="rounded-md border border-zinc-800 bg-zinc-900/85 px-3 py-2 text-xs text-zinc-300"
          >
            {nodes.length} files · {edges.length} imports
          </Panel>
          <GraphControlStack
            interactionMode={interactionMode}
            setInteractionMode={setInteractionMode}
          />
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
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadGraph = async () => {
      try {
        const response = await fetch("/api/graph", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load graph (${response.status})`);
        }

        const raw = (await response.json()) as GraphData;
        setGraphData(normalizeGraphData(raw));
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load graph");
      }
    };

    void loadGraph();

    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <p className="rounded-md border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-300">
        Loading graph...
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <GraphCanvas graphData={graphData} />
    </ReactFlowProvider>
  );
};

export default App;
