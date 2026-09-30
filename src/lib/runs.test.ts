import { describe, expect, it } from "vitest";
import type { SessionEvent } from "./stats";
import { activeMs, currentRunMs, isDoubleRun, lastRunEndMs, runDurationsMs } from "./runs";

const T0 = 1_000_000;
const clock = { startedAt: T0, pausedAt: null, pausedTotalMs: 0 };

describe("chronos de run", () => {
  const events: SessionEvent[] = [
    { type: "run", at: T0 + 70_000, elapsedMs: 70_000 },
    { type: "unique", at: T0 + 90_000, elapsedMs: 90_000 },
    { type: "run", at: T0 + 135_000, elapsedMs: 135_000 },
  ];

  it("calcule la durée de chaque run terminé", () => {
    expect(runDurationsMs(events, clock)).toEqual([70_000, 65_000]);
    expect(lastRunEndMs(events, clock)).toBe(135_000);
  });

  it("chronomètre le run en cours depuis le dernier « fin de run »", () => {
    expect(currentRunMs(events, clock, T0 + 150_000)).toBe(15_000);
    expect(currentRunMs([], clock, T0 + 42_000)).toBe(42_000);
  });

  it("exclut les pauses", () => {
    const paused = { startedAt: T0, pausedAt: T0 + 100_000, pausedTotalMs: 20_000 };
    expect(activeMs(paused, T0 + 999_999)).toBe(80_000);
    expect(currentRunMs([{ type: "run", at: T0 + 60_000, elapsedMs: 60_000 }], paused, T0 + 999_999)).toBe(20_000);
  });

  it("estime le temps des anciens événements sans elapsedMs", () => {
    expect(runDurationsMs([{ type: "run", at: T0 + 30_000 }], { ...clock, pausedTotalMs: 5_000 })).toEqual([25_000]);
  });
});

describe("isDoubleRun", () => {
  const events: SessionEvent[] = [{ type: "run", at: T0 }, { type: "unique", at: T0 + 1000 }];

  it("détecte un second « fin de run » trop rapproché", () => {
    expect(isDoubleRun(events, T0 + 2000)).toBe(true);
    expect(isDoubleRun(events, T0 + 6000)).toBe(false);
    expect(isDoubleRun([], T0)).toBe(false);
  });
});
