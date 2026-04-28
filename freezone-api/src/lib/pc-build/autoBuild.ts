import type { PcBuildSelections } from "./types";
import { emptySelections } from "./types";
import {
  CPU_CATALOG,
  GPU_CATALOG,
  MOTHERBOARD_CATALOG,
  RAM_CATALOG,
  STORAGE_CATALOG,
  PSU_CATALOG,
  CASE_CATALOG,
  COOLING_CATALOG,
} from "./catalog";
import { filterMotherboards, filterRam, filterCases, filterCoolingForBuild } from "./filters";
import { calculatePsuRecommendation, filterPsusByMinWattage } from "./psu";

export type UseCase = "gaming" | "workstation";

function pickCheapest<T extends { price: number }>(items: T[]): T | null {
  if (!items.length) return null;
  return items.reduce((a, b) => (a.price <= b.price ? a : b));
}

function pickNearBudget<T extends { price: number }>(items: T[], budget: number, preferHigher = true): T | null {
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const under = sorted.filter((i) => i.price <= budget * 0.35);
  if (under.length && !preferHigher) return under[under.length - 1];
  if (under.length) return under[Math.min(under.length - 1, Math.floor(under.length * 0.7))];
  return sorted[0] ?? null;
}

/**
 * Picks a coherent build under budget (IQD). Heuristic — tune weights for your market.
 */
export function autoBuildFromBudget(
  budget: number,
  useCase: UseCase
): PcBuildSelections {
  const s = emptySelections();

  const cpus = [...CPU_CATALOG].sort((a, b) => a.price - b.price);
  const gpus = [...GPU_CATALOG].sort((a, b) => a.price - b.price);

  if (useCase === "gaming") {
    s.gpu = pickNearBudget(gpus, budget, true) ?? gpus[gpus.length - 1];
    const gpuPrice = s.gpu?.price ?? 0;
    const cpuBudget = Math.max(budget * 0.22, budget - gpuPrice * 1.4);
    s.cpu = cpus.filter((c) => c.price <= cpuBudget).pop() ?? pickCheapest(cpus);
  } else {
    s.cpu = pickNearBudget(cpus, budget, true) ?? cpus[cpus.length - 1];
    const cpuPrice = s.cpu?.price ?? 0;
    const gpuBudget = Math.max(budget * 0.18, budget - cpuPrice * 1.5);
    s.gpu = gpus.filter((g) => g.price <= gpuBudget).pop() ?? pickCheapest(gpus);
  }

  if (!s.cpu || !s.gpu) return s;

  const mbs = filterMotherboards(MOTHERBOARD_CATALOG, s.cpu);
  s.motherboard = pickCheapest(mbs) ?? mbs[0] ?? null;
  if (!s.motherboard) return s;

  const rams = filterRam(s.motherboard, RAM_CATALOG);
  const ram = pickCheapest(rams);
  if (ram) s.ramKits = [ram];

  const nvme = STORAGE_CATALOG.find((x) => x.kind === "NVMe" && x.capacityGb >= 1000);
  if (nvme && s.motherboard.m2Slots > 0) s.storage = [nvme];

  const rec = calculatePsuRecommendation(s.cpu, s.gpu);
  const psus = filterPsusByMinWattage(PSU_CATALOG, rec.shelfWattage);
  s.psu = pickCheapest(psus) ?? psus[0] ?? null;

  const cases = filterCases(CASE_CATALOG, s.motherboard, s.gpu);
  s.pcCase = pickCheapest(cases) ?? cases[0] ?? null;
  if (!s.pcCase) return s;

  const coolers = filterCoolingForBuild(COOLING_CATALOG, s.cpu, s.pcCase);
  s.cooling = pickCheapest(coolers) ?? coolers[0] ?? null;

  return s;
}
