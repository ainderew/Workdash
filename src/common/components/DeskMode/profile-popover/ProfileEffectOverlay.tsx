import React from 'react';
import { resolveProfileEffect } from './profileEffects';

interface ProfileEffectOverlayProps {
  effect: string | null | undefined;
}

const PARTICLE_COUNT = 10;

/**
 * Cosmetic animated layer that plays over the profile card when it opens.
 * Renders a fixed set of particles styled per-effect by CSS (`.wd-profile-fx`).
 * Purely decorative — pointer-events disabled and hidden under reduced motion.
 */
export function ProfileEffectOverlay({ effect }: ProfileEffectOverlayProps) {
  const resolved = resolveProfileEffect(effect);
  if (!resolved) return null;

  return (
    <div className="wd-profile-fx" data-fx={resolved} aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
