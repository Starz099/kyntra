import { MarkerType, type Edge } from "@xyflow/react";
import type { FileNode } from "../types/graph";

export type RelationIndex = {
  incomingByNode: Map<string, string[]>;
  outgoingByNode: Map<string, string[]>;
};

type HandleSide = "left" | "right" | "top" | "bottom";

const SIDE_HANDLE_COUNT = 6;
const LAYOUT_STORAGE_KEY = "kyntra.graph.layout.v3";

export type LayoutSettings = {
  nodeSpacingX: number;
  nodeSpacingY: number;
  layoutScale: number;
  componentGapX: number;
  componentGapY: number;
  componentRowMaxWidth: number;
  isolatedZoneGapX: number;
  edgeOffsetBase: number;
  edgeOffsetStep: number;
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  nodeSpacingX: 420,
  nodeSpacingY: 250,
  layoutScale: 1.0,
  componentGapX: 180,
  componentGapY: 160,
  componentRowMaxWidth: 2500,
  isolatedZoneGapX: 240,
  edgeOffsetBase: 22,
  edgeOffsetStep: 8,
};

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

const layoutNodeCluster = (
  inputNodes: FileNode[],
  settings: LayoutSettings,
) => {
  if (inputNodes.length === 0) {
    return [];
  }

  if (inputNodes.length === 1) {
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
      const scaledX =
        centerX + (node.position.x - centerX) * settings.layoutScale;
      const scaledY =
        centerY + (node.position.y - centerY) * settings.layoutScale;

      const desiredCellX = Math.round(scaledX / settings.nodeSpacingX);
      const desiredCellY = Math.round(scaledY / settings.nodeSpacingY);
      const openCell = findOpenCell(desiredCellX, desiredCellY, occupied);
      occupied.add(`${openCell.x}:${openCell.y}`);

      return {
        ...node,
        position: {
          x: openCell.x * settings.nodeSpacingX,
          y: openCell.y * settings.nodeSpacingY,
        },
      };
    });
};

const buildNodeDegreeMap = (nodes: FileNode[], edges: Edge[]) => {
  const degreeByNode = new Map<string, number>();

  for (const node of nodes) {
    degreeByNode.set(node.id, 0);
  }

  for (const edge of edges) {
    degreeByNode.set(edge.source, (degreeByNode.get(edge.source) ?? 0) + 1);
    degreeByNode.set(edge.target, (degreeByNode.get(edge.target) ?? 0) + 1);
  }

  return degreeByNode;
};

const getConnectedComponents = (nodes: FileNode[], edges: Edge[]) => {
  const adjacency = new Map<string, Set<string>>();

  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    const stack = [node.id];
    visited.add(node.id);
    const component: string[] = [];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId) {
        continue;
      }

      component.push(currentId);
      const neighbors = adjacency.get(currentId);
      if (!neighbors) {
        continue;
      }

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          stack.push(neighborId);
        }
      }
    }

    components.push(component);
  }

  return components;
};

const layoutComponentsInRows = (
  components: FileNode[][],
  startX: number,
  startY: number,
  settings: LayoutSettings,
) => {
  const positionedNodes = new Map<string, FileNode>();
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let maxPlacedX = startX;

  for (const component of components) {
    const componentLayout = layoutNodeCluster(component, settings);
    const minX = Math.min(...componentLayout.map((node) => node.position.x));
    const minY = Math.min(...componentLayout.map((node) => node.position.y));
    const maxX = Math.max(...componentLayout.map((node) => node.position.x));
    const maxY = Math.max(...componentLayout.map((node) => node.position.y));

    const width = Math.max(
      maxX - minX + settings.nodeSpacingX,
      settings.nodeSpacingX,
    );
    const height = Math.max(
      maxY - minY + settings.nodeSpacingY,
      settings.nodeSpacingY,
    );

    if (cursorX > 0 && cursorX + width > settings.componentRowMaxWidth) {
      cursorX = 0;
      cursorY += rowHeight + settings.componentGapY;
      rowHeight = 0;
    }

    for (const node of componentLayout) {
      const normalizedX = node.position.x - minX;
      const normalizedY = node.position.y - minY;

      positionedNodes.set(node.id, {
        ...node,
        position: {
          x: startX + cursorX + normalizedX,
          y: startY + cursorY + normalizedY,
        },
      });
    }

    maxPlacedX = Math.max(maxPlacedX, startX + cursorX + width);
    cursorX += width + settings.componentGapX;
    rowHeight = Math.max(rowHeight, height);
  }

  return { positionedNodes, maxPlacedX };
};

export const spreadOutNodes = (
  inputNodes: FileNode[],
  inputEdges: Edge[],
  settings: LayoutSettings,
) => {
  if (inputNodes.length <= 1) {
    return inputNodes;
  }

  const degreeByNode = buildNodeDegreeMap(inputNodes, inputEdges);
  const nodesById = new Map(inputNodes.map((node) => [node.id, node]));
  const components = getConnectedComponents(inputNodes, inputEdges)
    .map((componentIds) =>
      componentIds
        .map((id) => nodesById.get(id))
        .filter((node): node is FileNode => Boolean(node)),
    )
    .filter((component) => component.length > 0)
    .sort((a, b) => b.length - a.length);

  const connectedComponents = components.filter(
    (component) =>
      component.length > 1 || (degreeByNode.get(component[0].id) ?? 0) > 0,
  );
  const isolatedComponents = components.filter(
    (component) =>
      component.length === 1 && (degreeByNode.get(component[0].id) ?? 0) === 0,
  );

  const connectedLayout = layoutComponentsInRows(
    connectedComponents,
    0,
    0,
    settings,
  );
  const isolatedLayout = layoutComponentsInRows(
    isolatedComponents,
    connectedLayout.maxPlacedX + settings.isolatedZoneGapX,
    0,
    settings,
  );

  const connectedById = connectedLayout.positionedNodes;
  const isolatedById = isolatedLayout.positionedNodes;

  return inputNodes.map((node) => {
    return connectedById.get(node.id) ?? isolatedById.get(node.id) ?? node;
  });
};

const getSourceAndTargetSides = (
  source: { x: number; y: number },
  target: { x: number; y: number },
): { sourceSide: HandleSide; targetSide: HandleSide } => {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX >= 0) {
      return { sourceSide: "right", targetSide: "left" };
    }

    return { sourceSide: "left", targetSide: "right" };
  }

  if (deltaY >= 0) {
    return { sourceSide: "bottom", targetSide: "top" };
  }

  return { sourceSide: "top", targetSide: "bottom" };
};

const assignEdgeHandles = (
  inputEdges: Edge[],
  nodes: FileNode[],
  settings: LayoutSettings,
) => {
  const positionByNodeId = new Map(
    nodes.map((node) => [node.id, node.position] as const),
  );
  const usageByNodeAndSide = new Map<string, number>();

  return inputEdges.map((edge) => {
    const sourcePosition = positionByNodeId.get(edge.source);
    const targetPosition = positionByNodeId.get(edge.target);

    const { sourceSide, targetSide } =
      sourcePosition && targetPosition
        ? getSourceAndTargetSides(sourcePosition, targetPosition)
        : { sourceSide: "right" as const, targetSide: "left" as const };

    const sourceKey = `${edge.source}:${sourceSide}`;
    const targetKey = `${edge.target}:${targetSide}`;

    const sourceSlot =
      (usageByNodeAndSide.get(sourceKey) ?? 0) % SIDE_HANDLE_COUNT;
    usageByNodeAndSide.set(sourceKey, sourceSlot + 1);

    const targetSlot =
      (usageByNodeAndSide.get(targetKey) ?? 0) % SIDE_HANDLE_COUNT;
    usageByNodeAndSide.set(targetKey, targetSlot + 1);

    return {
      ...edge,
      sourceHandle: `${sourceSide}-${sourceSlot}`,
      targetHandle: `${targetSide}-${targetSlot}`,
      pathOptions: {
        offset:
          settings.edgeOffsetBase +
          ((sourceSlot + targetSlot) % 4) * settings.edgeOffsetStep,
      },
    };
  });
};

export const buildStyledEdges = (
  rawEdges: Edge[],
  nodes: FileNode[],
  settings: LayoutSettings,
) => {
  return assignEdgeHandles(rawEdges, nodes, settings).map((edge) => ({
    ...edge,
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 1.4, ...edge.style },
  }));
};

export const restoreNodeLayout = (inputNodes: FileNode[]) => {
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

export const persistNodeLayout = (inputNodes: FileNode[]) => {
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

export const buildRelationIndex = (edges: Edge[]): RelationIndex => {
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
