export type SoundboardSound = {
  id: string;
  workspaceId: string | null;
  name: string;
  audioUrl: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  uploadedBy: number;
  createdAt: string;
};
