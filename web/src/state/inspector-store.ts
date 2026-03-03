import { create } from "zustand";

type InspectorState = {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
};

export const useInspectorStore = create<InspectorState>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));
