// Enable in the release build only after public admission and launch gates pass.
export const GUEST_PUBLIC_DISCOVERY = process.env.NEXT_PUBLIC_GUEST_TRIAL_PUBLIC === 'true';
