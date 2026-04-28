/**
 * PC Builder Compatibility Engine — core schema
 * Each part carries attributes needed for filtering & validation.
 */

export type SocketType = "AM5" | "LGA1700" | "LGA1851";

export type RamType = "DDR4" | "DDR5";

export type BoardFormFactor = "ATX" | "mATX" | "ITX";

export type PerformanceTier = "entry" | "mid" | "high" | "ultra";

export type PsuEfficiency = "Bronze" | "Gold" | "Platinum";

export type CoolingKind = "air" | "aio120" | "aio240" | "aio360";

export type StorageKind = "NVMe" | "SATA_SSD" | "HDD";

export interface CpuPart {
  id: string;
  name: string;
  brand: "Intel" | "AMD";
  socket: SocketType;
  /** Thermal design power (W) */
  tdpW: number;
  tier: PerformanceTier;
  price: number;
  /** Optional link to storefront product */
  productId?: number;
}

export interface GpuPart {
  id: string;
  name: string;
  brand: string;
  /** Board power (W) — use TGP / typical draw */
  powerW: number;
  lengthMm: number;
  tier: PerformanceTier;
  pcieGen: 4 | 5;
  price: number;
  productId?: number;
}

export interface MotherboardPart {
  id: string;
  name: string;
  socket: SocketType;
  chipset: string;
  ramType: RamType;
  ramSlots: 2 | 4;
  maxRamGb: number;
  m2Slots: number;
  sataPorts: number;
  formFactor: BoardFormFactor;
  price: number;
  productId?: number;
}

export interface RamPart {
  id: string;
  name: string;
  type: RamType;
  /** Total kit capacity */
  capacityGb: number;
  /** DIMMs in kit (1 or 2) */
  kitModules: 1 | 2;
  speedMhz: number;
  price: number;
  productId?: number;
}

export interface StoragePart {
  id: string;
  name: string;
  kind: StorageKind;
  capacityGb: number;
  price: number;
  productId?: number;
}

export interface PsuPart {
  id: string;
  name: string;
  wattage: number;
  efficiency: PsuEfficiency;
  price: number;
  productId?: number;
}

export interface CasePart {
  id: string;
  name: string;
  maxGpuLengthMm: number;
  supportedBoards: BoardFormFactor[];
  /** Supported radiator sizes (longest dimension mm) */
  radiatorSupportMm: number[];
  maxCoolerHeightMm: number;
  price: number;
  productId?: number;
}

export interface CoolingPart {
  id: string;
  name: string;
  kind: CoolingKind;
  /** Manufacturer TDP rating this cooler targets */
  maxTdpRating: number;
  heightMm?: number;
  radiatorMm?: 120 | 240 | 360;
  price: number;
  productId?: number;
}

/** Runtime selections (storage = multiple drives) */
export interface PcBuildSelections {
  cpu: CpuPart | null;
  gpu: GpuPart | null;
  motherboard: MotherboardPart | null;
  /** One or more RAM kits */
  ramKits: RamPart[];
  storage: StoragePart[];
  psu: PsuPart | null;
  pcCase: CasePart | null;
  cooling: CoolingPart | null;
}

export const emptySelections = (): PcBuildSelections => ({
  cpu: null,
  gpu: null,
  motherboard: null,
  ramKits: [],
  storage: [],
  psu: null,
  pcCase: null,
  cooling: null,
});

export type BuildWarningSeverity = "error" | "warn" | "info";

export interface BuildWarning {
  code: string;
  severity: BuildWarningSeverity;
  message: string;
}

export interface PsuRecommendation {
  baseLoadW: number;
  withBufferW: number;
  withMarginW: number;
  recommendedMinW: number;
  /** Rounded “shelf” wattage e.g. 650 */
  shelfWattage: number;
  marginPercent: number;
}
