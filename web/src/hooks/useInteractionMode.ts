import { useEffect, useState } from "react";

export type InteractionMode = "drag" | "select";

export const useInteractionMode = () => {
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("drag");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isEditable || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "1") {
        setInteractionMode("select");
      }

      if (event.key === "2") {
        setInteractionMode("drag");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return { interactionMode, setInteractionMode };
};
