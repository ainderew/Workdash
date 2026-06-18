import { toast } from "sonner";

type MediaKind = "microphone" | "camera";

/**
 * Map a getUserMedia rejection to a human, actionable toast. WebRTC device
 * failures otherwise propagate as bare DOMExceptions that only land in the
 * console — the user just sees a dead mic/camera with no explanation.
 */
export function surfaceMediaDeviceError(error: unknown, kind: MediaKind): void {
  toast.error(mediaErrorMessage(error, kind));
}

export function mediaErrorMessage(error: unknown, kind: MediaKind): string {
  const name = error instanceof DOMException ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return `${kind === "microphone" ? "Microphone" : "Camera"} access is blocked. Allow it in your browser's site settings, then try again.`;
    case "NotFoundError":
    case "OverconstrainedError":
      return `No ${kind} found. Check that one is connected and selected in settings.`;
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return `Your ${kind} is in use by another app. Close it and try again.`;
    default:
      return `Couldn't start your ${kind}. Check the device and its permissions, then try again.`;
  }
}
