import React, { useEffect } from "react";
import { ResponsivePie } from "@nivo/pie";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { useDotaChartTheme } from "./useDotaChartTheme";
import { DAMAGE_CHART_PALETTE } from "./chartColors";
import { DotaChartTooltip } from "./DotaChartTooltip";
import type { DamageCompositionData } from "../_types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function DamageCompositionWidget({ workspaceId, channelId }: Props) {
  const theme = useDotaChartTheme();
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_damage_composition`],
  ) as DamageCompositionData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_damage_composition");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No damage data yet" />;

  const gridCols = Math.min(data.players.length, 3);
  const colClass =
    gridCols === 1
      ? "grid-cols-1"
      : gridCols === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div className={`grid gap-3 ${colClass}`}>
      {data.players.map((player) => {
        const pieData = [
          {
            id: "Physical",
            value: player.physical,
            color: DAMAGE_CHART_PALETTE[0],
          },
          {
            id: "Magical",
            value: player.magical,
            color: DAMAGE_CHART_PALETTE[1],
          },
          {
            id: "Pure",
            value: player.pure,
            color: DAMAGE_CHART_PALETTE[2],
          },
        ];

        return (
          <div key={player.dotaAccountId} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <PlayerAvatar avatarUrl={player.avatarUrl} displayName={player.displayName} size={16} />
              <span className="text-[10px] font-semibold wd-text-muted uppercase tracking-wide">
                {player.displayName}
              </span>
            </div>
            <div className="h-[140px]">
              <ResponsivePie
                data={pieData}
                margin={{ top: 4, right: 4, bottom: 24, left: 4 }}
                innerRadius={0.55}
                padAngle={2}
                cornerRadius={4}
                colors={{ datum: "data.color" }}
                arcLabelsTextColor="white"
                arcLabel={(d) => `${d.value}%`}
                arcLabelsSkipAngle={15}
                enableArcLinkLabels={false}
                legends={[
                  {
                    anchor: "bottom",
                    direction: "row",
                    translateY: 22,
                    itemWidth: 56,
                    itemHeight: 12,
                    itemTextColor: "var(--wd-text-muted)",
                    symbolSize: 7,
                    symbolShape: "circle",
                  },
                ]}
                theme={theme}
                tooltip={({ datum }) => (
                  <DotaChartTooltip
                    items={[
                      {
                        label: datum.id as string,
                        value: `${datum.value}%`,
                        color: datum.color,
                      },
                    ]}
                  />
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
