import type {
  CpuPart,
  GpuPart,
  MotherboardPart,
  RamPart,
  StoragePart,
  CasePart,
  CoolingPart,
} from "./types";

/** Step 2 — motherboard must match CPU socket exactly */
export function filterMotherboards(
  motherboards: MotherboardPart[],
  cpu: CpuPart
): MotherboardPart[] {
  return motherboards.filter((mb) => mb.socket === cpu.socket);
}

/** Step 3 — RAM type must match board; caller validates capacity/slots separately */
export function filterRam(motherboard: MotherboardPart, ramCatalog: RamPart[]): RamPart[] {
  return ramCatalog.filter((r) => r.type === motherboard.ramType);
}

export interface RamLoadout {
  kits: RamPart[];
  totalGb: number;
  modulesUsed: number;
}

export function summarizeRamLoadout(kits: RamPart[]): RamLoadout {
  return {
    kits,
    totalGb: kits.reduce((s, k) => s + k.capacityGb, 0),
    modulesUsed: kits.reduce((s, k) => s + k.kitModules, 0),
  };
}

/** Returns false if adding kit would exceed slots or max GB */
export function canAddRamKit(
  motherboard: MotherboardPart,
  currentKits: RamPart[],
  kit: RamPart
): boolean {
  if (kit.type !== motherboard.ramType) return false;
  const { totalGb, modulesUsed } = summarizeRamLoadout([...currentKits, kit]);
  return modulesUsed <= motherboard.ramSlots && totalGb <= motherboard.maxRamGb;
}

export interface StorageCounts {
  nvme: number;
  sata: number;
}

export function countStorageUsage(drives: StoragePart[]): StorageCounts {
  return drives.reduce(
    (acc, d) => {
      if (d.kind === "NVMe") acc.nvme += 1;
      else acc.sata += 1;
      return acc;
    },
    { nvme: 0, sata: 0 }
  );
}

export function canAddStorageDrive(
  motherboard: MotherboardPart,
  current: StoragePart[],
  drive: StoragePart
): boolean {
  const { nvme, sata } = countStorageUsage(current);
  if (drive.kind === "NVMe") return nvme < motherboard.m2Slots;
  return sata < motherboard.sataPorts;
}

export function storageLimitsMessage(motherboard: MotherboardPart): string {
  return `You can install up to ${motherboard.m2Slots} NVMe/M.2 drive(s) and ${motherboard.sataPorts} SATA drive(s) on this motherboard.`;
}

/** Step 6 — case fits board + GPU length; cooling must fit case */
export function filterCases(
  cases: CasePart[],
  motherboard: MotherboardPart,
  gpu: GpuPart
): CasePart[] {
  return cases.filter(
    (c) =>
      c.supportedBoards.includes(motherboard.formFactor) &&
      c.maxGpuLengthMm >= gpu.lengthMm
  );
}

export function caseSupportsCooling(pcCase: CasePart, cooling: CoolingPart): boolean {
  if (cooling.kind === "air") {
    const h = cooling.heightMm ?? 0;
    return h <= pcCase.maxCoolerHeightMm;
  }
  const rad = cooling.radiatorMm ?? 0;
  return pcCase.radiatorSupportMm.some((supported) => supported >= rad);
}

export function filterCasesForCooling(
  cases: CasePart[],
  motherboard: MotherboardPart,
  gpu: GpuPart,
  cooling: CoolingPart
): CasePart[] {
  return filterCases(cases, motherboard, gpu).filter((c) => caseSupportsCooling(c, cooling));
}

/** Recommend air vs liquid from CPU TDP */
export function coolingKindHint(cpu: CpuPart): "air" | "liquid" {
  return cpu.tdpW <= 125 ? "air" : "liquid";
}

export function filterCoolingForCpu(
  coolingCatalog: CoolingPart[],
  cpu: CpuPart
): CoolingPart[] {
  return coolingCatalog.filter((c) => c.maxTdpRating >= cpu.tdpW);
}

export function filterCoolingForCase(
  coolingCatalog: CoolingPart[],
  pcCase: CasePart
): CoolingPart[] {
  return coolingCatalog.filter((c) => caseSupportsCooling(pcCase, c));
}

/** Combined: cool enough for CPU AND fits selected case */
export function filterCoolingForBuild(
  coolingCatalog: CoolingPart[],
  cpu: CpuPart,
  pcCase: CasePart
): CoolingPart[] {
  return coolingCatalog.filter(
    (c) => c.maxTdpRating >= cpu.tdpW && caseSupportsCooling(pcCase, c)
  );
}

export function gpuBalanceScore(gpu: GpuPart, cpu: CpuPart): number {
  const ratio = gpu.price / Math.max(cpu.price, 1000);
  const target = 1.15;
  return 1 / (1 + Math.abs(Math.log(ratio) - Math.log(target)));
}

export function isBalancedGpu(gpu: GpuPart, cpu: CpuPart): boolean {
  const r = gpu.price / Math.max(cpu.price, 1000);
  return r >= 0.3 && r <= 2.75;
}
