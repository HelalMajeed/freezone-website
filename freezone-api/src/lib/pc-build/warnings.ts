import type { PcBuildSelections, BuildWarning, CpuPart, GpuPart } from "./types";
import { calculatePsuRecommendation } from "./psu";
import { caseSupportsCooling, countStorageUsage, summarizeRamLoadout } from "./filters";

export function collectBuildWarnings(s: PcBuildSelections): BuildWarning[] {
  const out: BuildWarning[] = [];

  if (s.cpu && s.gpu) {
    const rec = calculatePsuRecommendation(s.cpu, s.gpu);
    if (s.psu && s.psu.wattage < rec.recommendedMinW) {
      out.push({
        code: "PSU_WEAK",
        severity: "error",
        message: `PSU may be too weak. Recommended at least ${rec.shelfWattage}W (system estimate ~${Math.round(rec.withMarginW)}W with ${rec.marginPercent}% margin).`,
      });
    }
  }

  if (s.pcCase && s.gpu && s.pcCase.maxGpuLengthMm < s.gpu.lengthMm) {
    out.push({
      code: "CASE_GPU_LENGTH",
      severity: "error",
      message: `Case clearance (${s.pcCase.maxGpuLengthMm}mm) is less than GPU length (${s.gpu.lengthMm}mm).`,
    });
  }

  if (s.cooling && s.cpu && s.cooling.maxTdpRating < s.cpu.tdpW) {
    out.push({
      code: "COOLING_TDP",
      severity: "warn",
      message: `Cooling is rated below CPU TDP (${s.cpu.tdpW}W). Consider a stronger cooler.`,
    });
  }

  if (s.pcCase && s.cooling && !caseSupportsCooling(s.pcCase, s.cooling)) {
    out.push({
      code: "CASE_COOLING",
      severity: "error",
      message: "Selected cooling does not fit the case (height or radiator size).",
    });
  }

  if (s.motherboard && s.ramKits.length > 0) {
    const { totalGb, modulesUsed } = summarizeRamLoadout(s.ramKits);
    if (modulesUsed > s.motherboard.ramSlots) {
      out.push({
        code: "RAM_SLOTS",
        severity: "error",
        message: `Too many RAM modules (${modulesUsed}) for this board (${s.motherboard.ramSlots} slots).`,
      });
    }
    if (totalGb > s.motherboard.maxRamGb) {
      out.push({
        code: "RAM_CAPACITY",
        severity: "error",
        message: `Total RAM ${totalGb}GB exceeds motherboard max ${s.motherboard.maxRamGb}GB.`,
      });
    }
  }

  if (s.motherboard && s.storage.length > 0) {
    const { nvme, sata } = countStorageUsage(s.storage);
    if (nvme > s.motherboard.m2Slots) {
      out.push({
        code: "STORAGE_M2",
        severity: "error",
        message: `Too many NVMe drives (${nvme}) for ${s.motherboard.m2Slots} M.2 slots.`,
      });
    }
    if (sata > s.motherboard.sataPorts) {
      out.push({
        code: "STORAGE_SATA",
        severity: "error",
        message: `Too many SATA devices (${sata}) for ${s.motherboard.sataPorts} ports.`,
      });
    }
  }

  return out;
}

export function performanceIndicator(cpu: CpuPart | null, gpu: GpuPart | null): "Low" | "Medium" | "High" | "Ultra" {
  if (!cpu || !gpu) return "Low";
  const tierScore = { entry: 1, mid: 2, high: 3, ultra: 4 };
  const avg = (tierScore[cpu.tier] + tierScore[gpu.tier]) / 2;
  if (avg <= 1.5) return "Low";
  if (avg <= 2.5) return "Medium";
  if (avg <= 3.5) return "High";
  return "Ultra";
}
