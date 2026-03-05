import React from 'react';

interface SettingsErrorBannerProps {
  message: string | null;
}

function SettingsErrorBanner({ message }: SettingsErrorBannerProps) {
  if (!message) return null;

  return (
    <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-sm wd-text-danger">
      {message}
    </p>
  );
}

export default SettingsErrorBanner;
