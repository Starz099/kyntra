import type { Edge, Node } from "@xyflow/react";

export type FileSymbol = {
  name: string;
  type: string;
};

export type FileNodeData = {
  label: string;
  fullPath: string;
  summary: string;
  symbols: FileSymbol[];
};

export type FileNode = Node<FileNodeData, "fileNode">;

export type GraphData = {
  nodes: FileNode[];
  edges: Edge[];
};

export const normalizeGraphData = (graph: GraphData): GraphData => {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    type: "fileNode" as const,
    draggable: true,
    selectable: true,
    data: {
      label: node.data?.label ?? node.id.split("/").pop() ?? node.id,
      fullPath: node.data?.fullPath ?? node.id,
      summary: node.data?.summary ?? "No summary available.",
      symbols: Array.isArray(node.data?.symbols) ? node.data.symbols : [],
    },
  }));

  const edges = graph.edges.map((edge) => ({
    ...edge,
    animated: edge.animated ?? true,
    type: edge.type ?? "smoothstep",
  }));

  return { nodes, edges };
};
