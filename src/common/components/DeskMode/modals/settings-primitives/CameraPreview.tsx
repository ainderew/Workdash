import React, { useRef, useEffect } from 'react';
import { VideoOff } from 'lucide-react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
}

function CameraPreview({ stream, isActive }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream, isActive]);

  if (!isActive || !stream) {
    return (
      <div className="flex aspect-video max-h-48 items-center justify-center rounded-lg border wd-border-subtle bg-[var(--wd-surface-elevated)]">
        <div className="flex flex-col items-center gap-1.5">
          <VideoOff size={24} className="wd-text-muted" />
          <p className="text-xs wd-text-muted">Camera preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border wd-border-subtle">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="aspect-video max-h-48 w-full object-cover [transform:scaleX(-1)]"
      />
    </div>
  );
}

export default CameraPreview;
