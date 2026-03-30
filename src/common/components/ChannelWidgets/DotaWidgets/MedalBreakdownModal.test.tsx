import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MedalBreakdownModal } from "./MedalBreakdownModal";
import type { MatchRecapEntry } from "../_types";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, onError, ...rest } = props;
    void fill;
    void priority;
    void onError;
    return <img {...rest} />;
  },
}));

type Player = MatchRecapEntry["players"][number];

function makeCorePlayer(overrides?: Partial<Player>): Player {
  return {
    displayName: "TestCore",
    avatarUrl: null,
    dotaAccountId: 100,
    heroId: 1,
    heroName: "Anti-Mage",
    heroIcon: "/icons/antimage.png",
    heroPortrait: "/portraits/antimage.png",
    kills: 12,
    deaths: 3,
    assists: 8,
    won: true,
    isMvp: false,
    highlights: [],
    performanceEstimate: {
      medal: "Divine",
      stars: 3,
      label: "Divine 3",
      imagePath: "/assets/dota-medals/divine.png",
      percentile: 0.92,
      isSupport: false,
      rawStats: {
        gpm: 623,
        xpm: 710,
        kills: 12,
        deaths: 3,
        assists: 8,
        heroDamage: 28500,
        towerDamage: 4200,
        heroHealing: 300,
        lastHits: 310,
      },
      benchmarks: {
        gpm: 0.85,
        xpm: 0.9,
        kpm: 0.78,
        lhpm: 0.88,
        hdpm: 0.92,
        hhpm: 0.15,
      },
      weights: {
        gpm: 0.25,
        xpm: 0.2,
        kpm: 0.1,
        lhpm: 0.2,
        hdpm: 0.2,
        hhpm: 0.05,
      },
      durationMin: 40,
    },
    ...overrides,
  };
}

function makeSupportPlayer(): Player {
  return {
    displayName: "TestSupport",
    avatarUrl: null,
    dotaAccountId: 200,
    heroId: 5,
    heroName: "Crystal Maiden",
    heroIcon: "/icons/cm.png",
    heroPortrait: "/portraits/cm.png",
    kills: 2,
    deaths: 7,
    assists: 22,
    won: true,
    isMvp: false,
    highlights: [],
    performanceEstimate: {
      medal: "Ancient",
      stars: 2,
      label: "Ancient 2",
      imagePath: "/assets/dota-medals/ancient.png",
      percentile: 0.87,
      isSupport: true,
      rawStats: {
        gpm: 280,
        xpm: 350,
        kills: 2,
        deaths: 7,
        assists: 22,
        heroDamage: 8500,
        towerDamage: 200,
        heroHealing: 5600,
        lastHits: 45,
      },
      benchmarks: {
        gpm: 0.4,
        xpm: 0.45,
        kpm: 0.6,
        lhpm: null,
        hdpm: 0.55,
        hhpm: 0.92,
      },
      weights: {
        gpm: 0.05,
        xpm: 0.05,
        kpm: 0.2,
        lhpm: 0.0,
        hdpm: 0.2,
        hhpm: 0.2,
      },
      durationMin: 35,
      visionStats: {
        obsPlaced: 14,
        senPlaced: 10,
        obsKills: 4,
        senKills: 2,
        visionScore: 0.82,
      },
    },
  };
}

describe("MedalBreakdownModal", () => {
  it("renders player info in header", () => {
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.getByText("TestCore")).toBeInTheDocument();
    expect(screen.getByText("Anti-Mage")).toBeInTheDocument();
    expect(screen.getByText("Divine 3")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("renders stat rows for each non-null benchmark", () => {
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.getByText("Gold/min")).toBeInTheDocument();
    expect(screen.getByText("XP/min")).toBeInTheDocument();
    expect(screen.getByText("Kills/min")).toBeInTheDocument();
    expect(screen.getByText("Last Hits/min")).toBeInTheDocument();
    expect(screen.getByText("Hero Dmg/min")).toBeInTheDocument();
    expect(screen.getByText("Healing/min")).toBeInTheDocument();
  });

  it("shows raw stat values", () => {
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    // GPM and XPM are already per-minute
    expect(screen.getByText("623")).toBeInTheDocument();
    expect(screen.getByText("710")).toBeInTheDocument();
    // heroDamage 28500 / 40 min = 712.5, rounded to 713 by formatRaw
    expect(screen.getByText("713")).toBeInTheDocument();
  });

  it("skips stat rows with null benchmarks", () => {
    const player = makeCorePlayer({
      performanceEstimate: {
        ...makeCorePlayer().performanceEstimate!,
        benchmarks: {
          gpm: 0.85,
          xpm: 0.9,
          kpm: 0.78,
          lhpm: 0.88,
          hdpm: 0.92,
          hhpm: null,
        },
      },
    });
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.getByText("Gold/min")).toBeInTheDocument();
    expect(screen.queryByText("Healing/min")).not.toBeInTheDocument();
  });

  it("renders vision section for support players", () => {
    const player = makeSupportPlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.getByText("Vision Score")).toBeInTheDocument();
    expect(screen.getByText("Obs placed")).toBeInTheDocument();
    expect(screen.getByText("Sen placed")).toBeInTheDocument();
    expect(screen.getByText("Obs killed")).toBeInTheDocument();
    expect(screen.getByText("Sen killed")).toBeInTheDocument();
  });

  it("does not render vision section for core players", () => {
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.queryByText("Vision Score")).not.toBeInTheDocument();
  });

  it("shows role indicator", () => {
    const corePlayer = makeCorePlayer();
    const { unmount } = render(
      <MedalBreakdownModal
        open={true}
        onClose={() => {}}
        player={corePlayer}
      />,
    );
    expect(screen.getByText("Core")).toBeInTheDocument();
    unmount();

    const supportPlayer = makeSupportPlayer();
    render(
      <MedalBreakdownModal
        open={true}
        onClose={() => {}}
        player={supportPlayer}
      />,
    );
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("renders medal tier tabs when allTierAverages is present", () => {
    const player = makeCorePlayer({
      performanceEstimate: {
        ...makeCorePlayer().performanceEstimate!,
        allTierAverages: {
          Divine: { gpm: 600, xpm: 650, kpm: 10, lhpm: 8, hdpm: 700, hhpm: 50 },
          Archon: { gpm: 400, xpm: 450, kpm: 7, lhpm: 5, hdpm: 500, hhpm: 30 },
        },
      },
    });
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    // Medal tabs should render
    expect(screen.getByRole("button", { name: "Divine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archon" })).toBeInTheDocument();
    // Default selected tier is the player's medal (Divine)
    expect(screen.getByText(/Divine: 600/)).toBeInTheDocument();
  });

  it("switches tier averages when clicking a different medal tab", () => {
    const player = makeCorePlayer({
      performanceEstimate: {
        ...makeCorePlayer().performanceEstimate!,
        allTierAverages: {
          Divine: { gpm: 600, xpm: 650, kpm: 10, lhpm: 8, hdpm: 700, hhpm: 50 },
          Archon: { gpm: 400, xpm: 450, kpm: 7, lhpm: 5, hdpm: 500, hhpm: 30 },
        },
      },
    });
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    // Click Archon tab
    fireEvent.click(screen.getByRole("button", { name: "Archon" }));
    expect(screen.getByText(/Archon: 400/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={onClose} player={player} />,
    );
    const closeButton = screen.getByRole("button", {
      name: /close modal/i,
    });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing when performanceEstimate is undefined", () => {
    const player = makeCorePlayer({ performanceEstimate: undefined });
    const { container } = render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("skips lhpm row for support players", () => {
    const player = makeSupportPlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.queryByText("Last Hits/min")).not.toBeInTheDocument();
  });

  it("renders footer attribution text", () => {
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(
      screen.getByText(/based on opendota benchmarks for anti-mage/i),
    ).toBeInTheDocument();
  });

  it("displays weight badges for stat rows", () => {
    const player = makeCorePlayer();
    render(
      <MedalBreakdownModal open={true} onClose={() => {}} player={player} />,
    );
    expect(screen.getByText("25%")).toBeInTheDocument();
    // 20% appears 3 times (xpm, lhpm, hdpm weights)
    expect(screen.getAllByText("20%")).toHaveLength(3);
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });
});
