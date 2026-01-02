import { CONFIG } from "@/common/utils/config";

export interface SoccerStats {
  id: number;
  userId: number;
  speed: number;
  kickPower: number;
  dribbling: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSoccerStatsInput {
  speed: number;
  kickPower: number;
  dribbling: number;
}

function getToken(): string | undefined {
  return window.__BACKEND_JWT__;
}

export async function getSoccerStats(): Promise<SoccerStats | null> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(`${CONFIG.SFU_SERVER_URL}/api/soccer-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch soccer stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching soccer stats:", error);
    throw error;
  }
}

export async function createSoccerStats(
  input: CreateSoccerStatsInput,
): Promise<SoccerStats> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(`${CONFIG.SFU_SERVER_URL}/api/soccer-stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to create soccer stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating soccer stats:", error);
    throw error;
  }
}
