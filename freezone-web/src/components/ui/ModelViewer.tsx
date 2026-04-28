"use client";

import "@google/model-viewer";

export function ModelViewer({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* model-viewer is a web component; JSX has no built-in types */}
      {/* @ts-expect-error TS doesn't know custom element model-viewer */}
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate
        camera-controls
        shadow-intensity="1"
        style={{ width: "100%", height: "100%" }}
        environment-image="neutral"
      />
    </div>
  );
}
