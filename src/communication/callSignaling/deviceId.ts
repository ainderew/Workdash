const DEVICE_ID_KEY = "workdash:deviceId";

/**
 * Returns a unique device ID per browser tab. Uses sessionStorage so each tab
 * gets its own ID (persists across page refreshes within the same tab, but
 * different tabs get different IDs). This prevents cross-tab session eviction
 * on the server while still handling same-tab reconnects correctly.
 */
export function getDeviceId(): string {
  let deviceId = sessionStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
