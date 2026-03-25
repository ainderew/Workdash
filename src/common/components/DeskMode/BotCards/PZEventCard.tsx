import React from "react";
import {
  Skull,
  Swords,
  LogIn,
  LogOut,
  Hammer,
  Building2,
  Home,
  MapPin,
  Package,
  type LucideIcon,
} from "lucide-react";

interface PZEventCardProps {
  eventType: string;
  content: string;
}

interface EventVariant {
  Icon: LucideIcon;
  label: string;
  colorClass: string;
  cardVariant: string;
}

const EVENT_VARIANTS: Record<string, EventVariant> = {
  player_death: {
    Icon: Skull,
    label: "Death",
    colorClass: "text-[var(--wd-danger)]",
    cardVariant: "wd-bot-card--danger",
  },
  pvp_kill: {
    Icon: Swords,
    label: "PVP Kill",
    colorClass: "text-[var(--wd-warning)]",
    cardVariant: "wd-bot-card--warning",
  },
  player_connect: {
    Icon: LogIn,
    label: "Connected",
    colorClass: "text-[var(--wd-success)]",
    cardVariant: "wd-bot-card--success",
  },
  player_disconnect: {
    Icon: LogOut,
    label: "Disconnected",
    colorClass: "text-[var(--wd-danger)]",
    cardVariant: "wd-bot-card--danger",
  },
  player_craft: {
    Icon: Hammer,
    label: "Crafted",
    colorClass: "text-[var(--wd-warning)]",
    cardVariant: "wd-bot-card--warning",
  },
  base_build: {
    Icon: Building2,
    label: "Base Build",
    colorClass: "text-[var(--wd-info)]",
    cardVariant: "wd-bot-card--info",
  },
  safehouse_event: {
    Icon: Home,
    label: "Safehouse",
    colorClass: "text-[var(--wd-accent)]",
    cardVariant: "",
  },
  map_change: {
    Icon: MapPin,
    label: "Map",
    colorClass: "wd-text-muted",
    cardVariant: "wd-bot-card--muted",
  },
  item_pickup: {
    Icon: Package,
    label: "Item",
    colorClass: "text-[var(--wd-info)]",
    cardVariant: "wd-bot-card--info",
  },
};

const BOLD_RE = /(\*\*[^*]+\*\*)/;

function renderBold(text: string): React.ReactNode[] {
  return text.split(BOLD_RE).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold wd-text-primary">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

const DEFAULT_VARIANT: EventVariant = {
  Icon: MapPin,
  label: "Event",
  colorClass: "wd-text-muted",
  cardVariant: "wd-bot-card--muted",
};

export function PZEventCard({ eventType, content }: PZEventCardProps) {
  const variant = EVENT_VARIANTS[eventType] ?? DEFAULT_VARIANT;
  const { Icon, label, colorClass, cardVariant } = variant;

  return (
    <div className={`wd-bot-card ${cardVariant} rounded-lg px-3.5 py-2.5`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} strokeWidth={2.5} className={`shrink-0 ${colorClass}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${colorClass}`}>
          {label}
        </span>
      </div>
      <p className="text-[13px] wd-text-secondary leading-snug">
        {renderBold(content)}
      </p>
    </div>
  );
}
