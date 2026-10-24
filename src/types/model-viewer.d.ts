import type * as React from "react";

/**
 * Minimal typing for the `<model-viewer>` custom element.
 *
 * `@google/model-viewer` is a web component, so React needs to know the tag
 * exists and which attributes it accepts. We only declare what we use — the
 * full API is large and these are the parts that matter for the exhibit viewer.
 */
export type ModelViewerElement = HTMLElement & {
  /** True when this device can hand the model off to AR. */
  canActivateAR?: boolean;
  /** Programmatic equivalent of tapping the AR button. */
  activateAR?: () => Promise<void>;
  loaded?: boolean;
};

type ModelViewerAttributes = {
  src?: string;
  alt?: string;
  poster?: string;
  /** Enable the AR entry point. */
  ar?: boolean;
  /** Order matters: WebXR, then Android Scene Viewer, then iOS Quick Look. */
  "ar-modes"?: string;
  /** Let ARCore decide real-world scale instead of forcing the model's units. */
  "ar-scale"?: string;
  "ios-src"?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: string;
  "environment-image"?: string;
  "shadow-intensity"?: string;
  exposure?: string;
  "camera-orbit"?: string;
  "touch-action"?: string;
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "manual";
  slot?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<ModelViewerElement>,
        ModelViewerElement
      > &
        ModelViewerAttributes;
    }
  }
}
