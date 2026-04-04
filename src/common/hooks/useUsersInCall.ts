import { useMemo, useRef } from "react";
import useCallStore from "@/common/store/callStore";

export function useUsersInCall(): Set<number> {
  const activeCallsByChannel = useCallStore(
    (state) => state.activeCallsByChannel,
  );
  const prevRef = useRef<Set<number>>(new Set());

  return useMemo(() => {
    const ids = new Set<number>();
    for (const call of Object.values(activeCallsByChannel)) {
      for (const p of call.participants) {
        ids.add(p.userId);
      }
    }

    const prev = prevRef.current;
    if (ids.size === prev.size && [...ids].every((id) => prev.has(id))) {
      return prev;
    }
    prevRef.current = ids;
    return ids;
  }, [activeCallsByChannel]);
}

