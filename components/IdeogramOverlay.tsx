"use client";

import { memo } from "react";

interface IdeogramOverlayProps {
  character: string;
}

/**
 * Semi-transparent guide character rendered on top of the canvas.
 * Container-query-scaled font so it fills ~60% of the smaller dimension.
 * pointer-events: none so all drawing passes through to the canvas below.
 */
const IdeogramOverlay = memo(function IdeogramOverlay({
  character,
}: IdeogramOverlayProps) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none flex items-center justify-center select-none"
      style={{ containerType: "size" }}
    >
      <span
        className="leading-none text-zinc-300"
        style={{ fontSize: "60cqmin", opacity: 0.12 }}
      >
        {character}
      </span>
    </div>
  );
});

export default IdeogramOverlay;
