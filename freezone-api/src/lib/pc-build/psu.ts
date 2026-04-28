import type { CpuPart, GpuPart, PsuPart, PsuRecommendation } from "./types";

const OTHER_COMPONENTS_BUFFER_W = 100;
const DEFAULT_MARGIN = 0.275; // ~27.5% between 25–30%

function roundShelfWattage(w: number): number {
  const step = 50;
  return Math.ceil(w / step) * step;
}

/**
 * CPU TDP + GPU power + fixed buffer for RAM/storage/fans/pumps.
 * Applies safety margin, returns minimum PSU rating to recommend.
 */
export function calculatePsuRecommendation(
  cpu: CpuPart,
  gpu: GpuPart,
  options?: { otherBufferW?: number; margin?: number }
): PsuRecommendation {
  const otherBufferW = options?.otherBufferW ?? OTHER_COMPONENTS_BUFFER_W;
  const margin = options?.margin ?? DEFAULT_MARGIN;

  const baseLoadW = cpu.tdpW + gpu.powerW + otherBufferW;
  const withMarginW = baseLoadW * (1 + margin);
  const shelfWattage = roundShelfWattage(withMarginW);

  return {
    baseLoadW,
    withBufferW: baseLoadW,
    withMarginW,
    recommendedMinW: Math.ceil(withMarginW),
    shelfWattage,
    marginPercent: Math.round(margin * 100),
  };
}

export function filterPsusByMinWattage(catalog: PsuPart[], minW: number): PsuPart[] {
  return catalog.filter((p) => p.wattage >= minW);
}
