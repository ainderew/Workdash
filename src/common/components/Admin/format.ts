import { format, formatDistanceToNow, parseISO } from "date-fns";

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });
const plainNumber = new Intl.NumberFormat("en");

/** Full precision — for tables and tooltips where the exact value matters. */
export const formatCount = (value: number): string => plainNumber.format(value);

/** Abbreviated — for stat tiles where width is tight. */
export const formatCompact = (value: number): string =>
  value < 1000 ? plainNumber.format(value) : compactNumber.format(value);

export const formatPercent = (ratio: number): string =>
  `${Math.round(ratio * 1000) / 10}%`;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export const formatDate = (iso: string): string =>
  format(parseISO(iso), "d MMM yyyy");

export const formatDateTime = (iso: string): string =>
  format(parseISO(iso), "d MMM yyyy, HH:mm");

/** "3 days ago", or an em dash when the timestamp was never set. */
export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

/** Short axis label — "12 Sep". */
export const formatDayLabel = (day: string): string =>
  format(parseISO(day), "d MMM");

export function displayName(user: {
  name: string | null;
  nickname: string | null;
  email: string;
}): string {
  return user.nickname ?? user.name ?? user.email.split("@")[0] ?? user.email;
}
