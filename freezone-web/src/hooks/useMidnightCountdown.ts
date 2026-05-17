import { useEffect, useState } from "react";

export type CountdownParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function partsFromMs(ms: number): CountdownParts {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { hours, minutes, seconds };
}

/** Countdown to end of local calendar day (flash-deal strip). */
export function useMidnightCountdown(): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() => partsFromMs(msUntilNextLocalMidnight()));

  useEffect(() => {
    const tick = () => setParts(partsFromMs(msUntilNextLocalMidnight()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return parts;
}

export function padCountdown(n: number): string {
  return String(n).padStart(2, "0");
}
