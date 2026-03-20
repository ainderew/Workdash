import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface SettingsErrorBannerProps {
  message: string | null;
}

function SettingsErrorBanner({ message }: SettingsErrorBannerProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
          className="overflow-hidden"
        >
          <div
            className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px]"
            style={{
              borderColor: 'color-mix(in srgb, var(--wd-danger) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--wd-danger) 6%, transparent)',
              color: 'var(--wd-danger)',
            }}
          >
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: 'color-mix(in srgb, var(--wd-danger) 12%, transparent)' }}
            >
              <AlertTriangle size={12} />
            </span>
            <span className="leading-snug">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SettingsErrorBanner;
