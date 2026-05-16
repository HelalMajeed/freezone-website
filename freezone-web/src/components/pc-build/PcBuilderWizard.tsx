"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "@/i18n/hooks";
import { useRouter } from "@/navigation";
import { useCart } from "@/lib/store";
import type { Product } from "@/lib/data";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import styles from "@/app/locale/pc-builder/pcBuilder.module.css";
import {
  X,
  Cpu,
  HardDrive,
  Zap,
  Box,
  Monitor,
  Database,
  Thermometer,
  Layout,
  Headphones,
  Mouse,
  Keyboard,
  Armchair,
  BoxSelect,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  emptySelections,
  type PcBuildSelections,
  type CpuPart,
  type GpuPart,
  type MotherboardPart,
  type RamPart,
  type StoragePart,
  type PsuPart,
  type CasePart,
  type CoolingPart,
  CPU_CATALOG,
  GPU_CATALOG,
  MOTHERBOARD_CATALOG,
  RAM_CATALOG,
  STORAGE_CATALOG,
  PSU_CATALOG,
  CASE_CATALOG,
  COOLING_CATALOG,
  filterMotherboards,
  filterRam,
  canAddRamKit,
  summarizeRamLoadout,
  storageLimitsMessage,
  canAddStorageDrive,
  calculatePsuRecommendation,
  filterPsusByMinWattage,
  filterCases,
  filterCoolingForBuild,
  collectBuildWarnings,
  performanceIndicator,
  autoBuildFromBudget,
  gpuBalanceScore,
  isBalancedGpu,
  type EngineCoreKey,
  isCoreStepUnlocked,
  cascadeClearFrom,
} from "@/lib/pc-build";

type AccKey = "screen" | "desk" | "headphones" | "mouse" | "keyboard" | "chair";

const ACC_PRODUCT_STORAGE: Record<AccKey, string> = {
  screen: "monitor",
  desk: "desk",
  headphones: "headphones",
  mouse: "mouse",
  keyboard: "keyboard",
  chair: "chair",
};

const ACCESSORY_KEYS: AccKey[] = ["screen", "desk", "headphones", "mouse", "keyboard", "chair"];

type ModalOpen =
  | EngineCoreKey
  | AccKey
  | "cpuPlatform"
  | null;

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

function storeProduct(productId: number | undefined, products: Product[]): Product | undefined {
  if (productId == null) return undefined;
  return products.find((p) => p.id === productId);
}

function selectionsToStoreProducts(
  s: PcBuildSelections,
  acc: Record<AccKey, Product | null>,
  products: Product[],
): Product[] {
  const ids = new Set<number>();
  const take = (p: { productId?: number } | null | undefined) => {
    if (p?.productId) ids.add(p.productId);
  };
  take(s.cpu);
  take(s.gpu);
  take(s.motherboard);
  s.ramKits.forEach(take);
  s.storage.forEach(take);
  take(s.psu);
  take(s.pcCase);
  take(s.cooling);
  (Object.values(acc).filter(Boolean) as Product[]).forEach((p) => ids.add(p.id));
  return products.filter((p) => ids.has(p.id));
}

function totalPrice(s: PcBuildSelections, acc: Record<AccKey, Product | null>): number {
  let t = 0;
  if (s.cpu) t += s.cpu.price;
  if (s.gpu) t += s.gpu.price;
  if (s.motherboard) t += s.motherboard.price;
  s.ramKits.forEach((k) => (t += k.price));
  s.storage.forEach((d) => (t += d.price));
  if (s.psu) t += s.psu.price;
  if (s.pcCase) t += s.pcCase.price;
  if (s.cooling) t += s.cooling.price;
  Object.values(acc).forEach((p) => {
    if (p) t += p.price;
  });
  return t;
}

function partCount(s: PcBuildSelections, acc: Record<AccKey, Product | null>): number {
  let n = 0;
  if (s.cpu) n++;
  if (s.gpu) n++;
  if (s.motherboard) n++;
  n += s.ramKits.length;
  n += s.storage.length;
  if (s.psu) n++;
  if (s.pcCase) n++;
  if (s.cooling) n++;
  n += Object.values(acc).filter(Boolean).length;
  return n;
}

function prereqLabel(key: EngineCoreKey, tPb: (k: string) => string): string {
  const map: Record<EngineCoreKey, string> = {
    cpu: "",
    gpu: tPb("cpu"),
    mb: tPb("gpu"),
    ram: tPb("mb"),
    storage: tPb("ram"),
    psu: tPb("ram"),
    case: tPb("psu"),
    cooling: tPb("case"),
  };
  return map[key];
}

export function PcBuilderWizard() {
  const tPb = useTranslations("PcBuilder");
  const tEng = useTranslations("PcEngine");
  const tCart = useTranslations("Cart");
  const router = useRouter();
  const { addMultipleItems } = useCart();
  const { catalog } = useStorefront();
  const productCatalog = catalog.products;

  const [s, setS] = useState<PcBuildSelections>(() => emptySelections());
  const [acc, setAcc] = useState<Record<AccKey, Product | null>>({
    screen: null,
    desk: null,
    headphones: null,
    mouse: null,
    keyboard: null,
    chair: null,
  });

  const [activeModal, setActiveModal] = useState<ModalOpen>(null);
  const [cpuPhase, setCpuPhase] = useState<"platform" | "list">("platform");
  const [cpuPlatformFilter, setCpuPlatformFilter] = useState<"intel" | "amd" | null>(null);
  const [active3D, setActive3D] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState("2500000");
  const [autoUseCase, setAutoUseCase] = useState<"gaming" | "workstation">("gaming");

  useEffect(() => {
    import("@google/model-viewer").catch(console.error);
  }, []);

  useEffect(() => {
    if (activeModal !== "cpu" && activeModal !== "cpuPlatform" && !s.cpu) {
      setCpuPhase("platform");
      setCpuPlatformFilter(null);
    }
  }, [activeModal, s.cpu]);

  const openCpuModal = () => {
    if (!isCoreStepUnlocked("cpu", s)) return;
    setActive3D(null);
    if (s.cpu) {
      setCpuPhase("list");
      setCpuPlatformFilter(s.cpu.brand.toLowerCase() === "intel" ? "intel" : "amd");
      setActiveModal("cpu");
    } else {
      setCpuPhase("platform");
      setCpuPlatformFilter(null);
      setActiveModal("cpuPlatform");
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setActive3D(null);
  };

  const psuRec = useMemo(
    () => (s.cpu && s.gpu ? calculatePsuRecommendation(s.cpu, s.gpu) : null),
    [s.cpu, s.gpu]
  );

  const psuOptions = useMemo(() => {
    if (!psuRec) return PSU_CATALOG;
    return filterPsusByMinWattage(PSU_CATALOG, psuRec.shelfWattage);
  }, [psuRec]);

  const gpuList = useMemo(() => {
    const list = [...GPU_CATALOG];
    if (s.cpu) {
      list.sort((a, b) => gpuBalanceScore(b, s.cpu!) - gpuBalanceScore(a, s.cpu!));
    }
    return list;
  }, [s.cpu]);

  const warnings = useMemo(() => collectBuildWarnings(s), [s]);
  const perf = performanceIndicator(s.cpu, s.gpu);
  const perfLabel =
    perf === "Low"
      ? tEng("tierLow")
      : perf === "Medium"
        ? tEng("tierMedium")
        : perf === "High"
          ? tEng("tierHigh")
          : tEng("tierUltra");

  const handleRemoveCore = (key: EngineCoreKey) => {
    setS((prev) => cascadeClearFrom(prev, key));
  };

  const handleRemoveAcc = (key: AccKey) => {
    setAcc((p) => ({ ...p, [key]: null }));
  };

  const runAutoBuild = () => {
    const b = Number(String(budgetInput).replace(/,/g, ""));
    if (!Number.isFinite(b) || b < 0) return;
    const build = autoBuildFromBudget(b, autoUseCase);
    setS(build);
  };

  const addToCart = () => {
    const items = selectionsToStoreProducts(s, acc, productCatalog);
    if (items.length) {
      addMultipleItems(items);
      router.push("/cart");
    }
  };

  const renderSelectCardForProduct = (p: Product, onPick: () => void, extra?: React.ReactNode) => {
    const img = p.images?.[0];
    return (
      <div key={p.id} className={styles.selectCard} onClick={onPick}>
        <div className={styles.cardVisual} onClick={(e) => (p.model3d ? e.stopPropagation() : undefined)}>
          {active3D === p.id ? (
            /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
            // @ts-ignore custom element
            <model-viewer src={p.model3d!} camera-controls auto-rotate className={styles.modelViewer} />
          ) : (
            <>
              {img ? (
                <img src={img} alt={p.name} width={120} height={90} className={styles.cardImage} loading="lazy" />
              ) : (
                <BoxSelect size={40} color="var(--border-color)" />
              )}
              {p.model3d && (
                <button
                  type="button"
                  className={styles.badge3d}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive3D(active3D === p.id ? null : p.id);
                  }}
                >
                  3D
                </button>
              )}
            </>
          )}
        </div>
        <div className={styles.cardMain}>
          <div className={styles.cardTitleRow}>
            <h4 className={styles.cardTitle}>{p.name}</h4>
            {extra}
          </div>
          <p className={styles.cardMeta}>
            {p.brand} · {p.desc}
          </p>
        </div>
        <div className={styles.cardPrice}>
          <div className={styles.priceValue}>{formatMoney(p.price)}</div>
          <div className={styles.priceLabel}>IQD</div>
        </div>
      </div>
    );
  };

  const renderEnginePartCard = (
    id: string,
    name: string,
    meta: string,
    price: number,
    productId: number | undefined,
    onPick: () => void,
    extra?: React.ReactNode
  ) => {
    const sp = storeProduct(productId, productCatalog);
    if (sp) {
      return renderSelectCardForProduct(sp, onPick, extra);
    }
    return (
      <div key={id} className={styles.selectCard} onClick={onPick}>
        <div className={styles.cardVisual}>
          <BoxSelect size={40} color="var(--border-color)" />
        </div>
        <div className={styles.cardMain}>
          <div className={styles.cardTitleRow}>
            <h4 className={styles.cardTitle}>{name}</h4>
            {extra}
          </div>
          <p className={styles.cardMeta}>{meta}</p>
        </div>
        <div className={styles.cardPrice}>
          <div className={styles.priceValue}>{formatMoney(price)}</div>
          <div className={styles.priceLabel}>IQD</div>
        </div>
      </div>
    );
  };

  const modalTitle = () => {
    if (activeModal === "cpuPlatform" || (activeModal === "cpu" && cpuPhase === "platform"))
      return tEng("chooseCpuPlatform");
    if (activeModal === "cpu") return tPb("selectCategory", { name: tPb("cpu") });
    if (activeModal === "gpu") return tPb("selectCategory", { name: tPb("gpu") });
    if (activeModal === "mb") return tPb("selectCategory", { name: tPb("mb") });
    if (activeModal === "ram") return tPb("selectCategory", { name: tPb("ram") });
    if (activeModal === "storage") return tPb("selectCategory", { name: tPb("storage") });
    if (activeModal === "psu") return tPb("selectCategory", { name: tPb("psu") });
    if (activeModal === "case") return tPb("selectCategory", { name: tPb("case") });
    if (activeModal === "cooling") return tPb("selectCategory", { name: tPb("cooling") });
    if (activeModal === "screen") return tPb("selectCategory", { name: tPb("monitor") });
    if (activeModal === "desk") return tPb("selectCategory", { name: tPb("desk") });
    if (activeModal === "headphones") return tPb("selectCategory", { name: tPb("headphones") });
    if (activeModal === "mouse") return tPb("selectCategory", { name: tPb("mouse") });
    if (activeModal === "keyboard") return tPb("selectCategory", { name: tPb("keyboard") });
    if (activeModal === "chair") return tPb("selectCategory", { name: tPb("chair") });
    return "";
  };

  const renderModalBody = () => {
    if (activeModal === "cpuPlatform" || (activeModal === "cpu" && cpuPhase === "platform")) {
      return (
        <div className={styles.modalBody}>
          <p className={styles.platformIntro}>{tEng("platformIntro")}</p>
          <div className={styles.platformGrid}>
            <button
              type="button"
              className={styles.platformCard}
              onClick={() => {
                setCpuPlatformFilter("intel");
                setCpuPhase("list");
                setActiveModal("cpu");
              }}
            >
              <Cpu size={36} />
              <span className={styles.platformName}>{tEng("intel")}</span>
              <span className={styles.platformSub}>{tEng("intelSub")}</span>
            </button>
            <button
              type="button"
              className={styles.platformCard}
              onClick={() => {
                setCpuPlatformFilter("amd");
                setCpuPhase("list");
                setActiveModal("cpu");
              }}
            >
              <Cpu size={36} />
              <span className={styles.platformName}>{tEng("amd")}</span>
              <span className={styles.platformSub}>{tEng("amdSub")}</span>
            </button>
          </div>
        </div>
      );
    }

    if (activeModal === "cpu" && cpuPhase === "list") {
      const list = CPU_CATALOG.filter(
        (c) => !cpuPlatformFilter || c.brand.toLowerCase() === cpuPlatformFilter
      );
      return (
        <div className={styles.modalBody}>
          <button
            type="button"
            className={styles.backPlatformBtn}
            disabled={!!s.cpu}
            onClick={() => {
              if (!s.cpu) {
                setActiveModal("cpuPlatform");
                setCpuPhase("platform");
              }
            }}
          >
            {tEng("changePlatform")}
          </button>
          {list.map((c: CpuPart) =>
            renderEnginePartCard(
              c.id,
              c.name,
              `${c.socket} · ${c.tdpW}W TDP`,
              c.price,
              c.productId,
              () => {
                setS((p) => ({ ...p, cpu: c }));
                closeModal();
              }
            )
          )}
        </div>
      );
    }

    if (activeModal === "gpu") {
      return (
        <div className={styles.modalBody}>
          {s.cpu && <p className={styles.gpuHint}>{tEng("gpuBalancedHint")}</p>}
          {gpuList.map((g: GpuPart, idx: number) => {
            const badge =
              s.cpu && idx < 2 && isBalancedGpu(g, s.cpu) ? (
                <span className={styles.balancedBadge}>{tEng("balancedMatch")}</span>
              ) : undefined;
            return renderEnginePartCard(
              g.id,
              g.name,
              `${g.powerW}W · ${g.lengthMm}mm`,
              g.price,
              g.productId,
              () => {
                setS((p) => ({ ...p, gpu: g }));
                closeModal();
              },
              badge
            );
          })}
        </div>
      );
    }

    if (activeModal === "mb" && s.cpu) {
      const mbs = filterMotherboards(MOTHERBOARD_CATALOG, s.cpu);
      return (
        <div className={styles.modalBody}>
          {mbs.length === 0 ? (
            <p style={{ textAlign: "center", padding: 40, color: "gray" }}>{tEng("noCompatibleMb")}</p>
          ) : (
            mbs.map((mb: MotherboardPart) =>
              renderEnginePartCard(
                mb.id,
                mb.name,
                `${mb.socket} · ${mb.ramType} · ${mb.formFactor} · M.2×${mb.m2Slots} SATA×${mb.sataPorts}`,
                mb.price,
                mb.productId,
                () => {
                  setS((p) => ({
                    ...p,
                    motherboard: mb,
                    ramKits: [],
                    storage: [],
                  }));
                  closeModal();
                }
              )
            )
          )}
        </div>
      );
    }

    if (activeModal === "ram" && s.motherboard) {
      const opts = filterRam(s.motherboard, RAM_CATALOG);
      return (
        <div className={styles.modalBody}>
          <p className={styles.infoBox}>
            {s.motherboard.ramType} · {s.motherboard.ramSlots} slots · max {s.motherboard.maxRamGb} GB
          </p>
          <p className={styles.hint}>
            {(() => {
              const { modulesUsed, totalGb } = summarizeRamLoadout(s.ramKits);
              return tEng("ramSummary", { modules: modulesUsed, gb: totalGb });
            })()}
          </p>
          {opts.map((kit: RamPart) => {
            const ok = canAddRamKit(s.motherboard!, s.ramKits, kit);
            return (
              <div
                key={kit.id}
                className={styles.selectCard}
                style={{ opacity: ok ? 1 : 0.45, cursor: ok ? "pointer" : "not-allowed" }}
                onClick={() => {
                  if (ok) setS((p) => ({ ...p, ramKits: [...p.ramKits, kit] }));
                }}
              >
                <div className={styles.cardVisual}>
                  <BoxSelect size={40} color="var(--border-color)" />
                </div>
                <div className={styles.cardMain}>
                  <h4 className={styles.cardTitle}>{kit.name}</h4>
                  <p className={styles.cardMeta}>
                    {kit.capacityGb}GB · {kit.kitModules} DIMM · +{tEng("addRamKit")}
                  </p>
                </div>
                <div className={styles.cardPrice}>
                  <div className={styles.priceValue}>{formatMoney(kit.price)}</div>
                  <div className={styles.priceLabel}>IQD</div>
                </div>
              </div>
            );
          })}
          <button type="button" className={`btn-outline ${styles.checkoutBtn}`} style={{ marginTop: 8 }} onClick={closeModal}>
            {tEng("next")}
          </button>
        </div>
      );
    }

    if (activeModal === "storage" && s.motherboard) {
      return (
        <div className={styles.modalBody}>
          <p className={styles.infoBox}>{storageLimitsMessage(s.motherboard)}</p>
          {STORAGE_CATALOG.map((drive: StoragePart) => {
            const ok = canAddStorageDrive(s.motherboard!, s.storage, drive);
            return renderEnginePartCard(
              drive.id,
              drive.name,
              `${drive.kind} · ${drive.capacityGb} GB`,
              drive.price,
              drive.productId,
              () => {
                if (ok) setS((p) => ({ ...p, storage: [...p.storage, drive] }));
              }
            );
          })}
          <button type="button" className={`btn-outline ${styles.checkoutBtn}`} style={{ marginTop: 8 }} onClick={closeModal}>
            {tEng("next")}
          </button>
        </div>
      );
    }

    if (activeModal === "psu") {
      return (
        <div className={styles.modalBody}>
          {psuRec && (
            <p className={styles.infoBox}>
              {tEng("psuRec", {
                w: psuRec.shelfWattage,
                raw: Math.round(psuRec.withMarginW),
                margin: psuRec.marginPercent,
              })}
            </p>
          )}
          {psuOptions.map((psu: PsuPart) =>
            renderEnginePartCard(
              psu.id,
              `${psu.name} (${psu.wattage}W ${psu.efficiency})`,
              "PSU",
              psu.price,
              psu.productId,
              () => {
                setS((p) => ({ ...p, psu }));
                closeModal();
              }
            )
          )}
        </div>
      );
    }

    if (activeModal === "case" && s.motherboard && s.gpu) {
      const cases = filterCases(CASE_CATALOG, s.motherboard, s.gpu);
      return (
        <div className={styles.modalBody}>
          {cases.map((c: CasePart) =>
            renderEnginePartCard(
              c.id,
              c.name,
              `GPU≤${c.maxGpuLengthMm}mm · ${c.supportedBoards.join("/")}`,
              c.price,
              c.productId,
              () => {
                setS((p) => ({ ...p, pcCase: c, cooling: null }));
                closeModal();
              }
            )
          )}
        </div>
      );
    }

    if (activeModal === "cooling" && s.cpu && s.pcCase) {
      const coolers = filterCoolingForBuild(COOLING_CATALOG, s.cpu, s.pcCase);
      return (
        <div className={styles.modalBody}>
          {coolers.length === 0 ? (
            <p className={styles.warnBox}>{tEng("noCoolingFit")}</p>
          ) : (
            coolers.map((c: CoolingPart) =>
              renderEnginePartCard(
                c.id,
                c.name,
                `${c.kind} · rated ${c.maxTdpRating}W`,
                c.price,
                c.productId,
                () => {
                  setS((p) => ({ ...p, cooling: c }));
                  closeModal();
                }
              )
            )
          )}
        </div>
      );
    }

    if (activeModal && ACCESSORY_KEYS.includes(activeModal as AccKey)) {
      const key = activeModal as AccKey;
      const storageKey = ACC_PRODUCT_STORAGE[key];
      const opts = productCatalog.filter((p) => p.cat === "components" && p.storage === storageKey);
      return (
        <div className={styles.modalBody}>
          {opts.length === 0 ? (
            <p style={{ textAlign: "center", padding: 40, color: "gray" }}>{tPb("noProducts")}</p>
          ) : (
            opts.map((p) =>
              renderSelectCardForProduct(p, () => {
                setAcc((a) => ({ ...a, [key]: p }));
                closeModal();
              })
            )
          )}
        </div>
      );
    }

    return null;
  };

  const coreRow = (
    key: EngineCoreKey,
    icon: React.ReactNode,
    name: string,
    selectedLabel: string,
    selectedPrice: number | null,
    onChoose: () => void,
    hasSelection: boolean,
    showChooseWhenSelected = false
  ) => {
    const unlocked = isCoreStepUnlocked(key, s);
    const hint = !unlocked && prereqLabel(key, tPb) ? tPb("completeStepFirst", { name: prereqLabel(key, tPb) }) : "";
    return (
      <div key={key} className={`${styles.row} ${!unlocked ? styles.rowLocked : ""}`}>
        <div className={styles.rowLeft}>
          <div className={styles.iconBox}>{icon}</div>
          <div>
            <h3 className={styles.partName}>{name}</h3>
            <div className={styles.selectedItem}>{selectedLabel}</div>
            {!unlocked && hint ? <p className={styles.stepHint}>{hint}</p> : null}
          </div>
        </div>
        <div className={styles.rowRight}>
          {selectedPrice != null && <span className={styles.partPrice}>{formatMoney(selectedPrice)} IQD</span>}
          {hasSelection ? (
            <>
              {showChooseWhenSelected && unlocked ? (
                <button type="button" className={styles.chooseBtn} onClick={onChoose}>
                  {tPb("choose")}
                </button>
              ) : null}
              <button type="button" className={styles.removeBtn} onClick={() => handleRemoveCore(key)}>
                {tPb("remove")}
              </button>
            </>
          ) : (
            <button type="button" className={styles.chooseBtn} disabled={!unlocked} onClick={onChoose}>
              {tPb("choose")}
            </button>
          )}
        </div>
      </div>
    );
  };

  const accRow = (key: AccKey, icon: React.ReactNode, name: string) => {
    const sel = acc[key];
    return (
      <div key={key} className={styles.row}>
        <div className={styles.rowLeft}>
          <div className={styles.iconBox}>{icon}</div>
          <div>
            <h3 className={styles.partName}>{name}</h3>
            <div className={styles.selectedItem}>{sel ? sel.name : tPb("noComponent")}</div>
          </div>
        </div>
        <div className={styles.rowRight}>
          {sel && <span className={styles.partPrice}>{formatMoney(sel.price)} IQD</span>}
          {sel ? (
            <button type="button" className={styles.removeBtn} onClick={() => handleRemoveAcc(key)}>
              {tPb("remove")}
            </button>
          ) : (
            <button
              type="button"
              className={styles.chooseBtn}
              onClick={() => {
                setActive3D(null);
                setActiveModal(key);
              }}
            >
              {tPb("choose")}
            </button>
          )}
        </div>
      </div>
    );
  };

  const ramLabel =
    s.ramKits.length === 0
      ? tPb("noComponent")
      : `${summarizeRamLoadout(s.ramKits).totalGb} GB · ${s.ramKits.length} kit(s)`;
  const ramPrice =
    s.ramKits.length === 0 ? null : s.ramKits.reduce((a, k) => a + k.price, 0);
  const storageLabel =
    s.storage.length === 0 ? tPb("noComponent") : `${s.storage.length} drive(s)`;
  const storagePrice =
    s.storage.length === 0 ? null : s.storage.reduce((a, d) => a + d.price, 0);

  return (
    <div className={`container ${styles.layout}`}>
      <div className={styles.builderCol}>
        <div className={styles.header}>
          <h1 className={styles.title}>{tPb("title")}</h1>
          <p className={styles.subtitle}>{tPb("subtitle")}</p>
          <p className={styles.workflowNote}>{tEng("workflowNote")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 14 }}>
            <input
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-light)", width: 140 }}
              aria-label={tEng("budgetLabel")}
            />
            <select
              value={autoUseCase}
              onChange={(e) => setAutoUseCase(e.target.value as "gaming" | "workstation")}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              <option value="gaming">{tEng("useCaseGaming")}</option>
              <option value="workstation">{tEng("useCaseWorkstation")}</option>
            </select>
            <button type="button" className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }} onClick={runAutoBuild}>
              {tEng("autoBuild")}
            </button>
          </div>
        </div>

        <div className={styles.partsList}>
          {coreRow(
            "cpu",
            <Cpu size={22} />,
            tPb("cpu"),
            s.cpu?.name ?? tPb("noComponent"),
            s.cpu?.price ?? null,
            openCpuModal,
            !!s.cpu
          )}
          {coreRow(
            "gpu",
            <Monitor size={22} />,
            tPb("gpu"),
            s.gpu?.name ?? tPb("noComponent"),
            s.gpu?.price ?? null,
            () => {
              setActive3D(null);
              setActiveModal("gpu");
            },
            !!s.gpu
          )}
          {coreRow(
            "mb",
            <Database size={22} />,
            tPb("mb"),
            s.motherboard?.name ?? tPb("noComponent"),
            s.motherboard?.price ?? null,
            () => {
              setActive3D(null);
              setActiveModal("mb");
            },
            !!s.motherboard
          )}
          {coreRow(
            "ram",
            <HardDrive size={22} />,
            tPb("ram"),
            ramLabel,
            ramPrice,
            () => {
              setActive3D(null);
              setActiveModal("ram");
            },
            s.ramKits.length > 0,
            true
          )}
          {coreRow(
            "storage",
            <HardDrive size={22} />,
            tPb("storage"),
            storageLabel,
            storagePrice,
            () => {
              setActive3D(null);
              setActiveModal("storage");
            },
            s.storage.length > 0,
            true
          )}
          {coreRow(
            "psu",
            <Zap size={22} />,
            tPb("psu"),
            s.psu?.name ?? tPb("noComponent"),
            s.psu?.price ?? null,
            () => {
              setActive3D(null);
              setActiveModal("psu");
            },
            !!s.psu
          )}
          {coreRow(
            "case",
            <Box size={22} />,
            tPb("case"),
            s.pcCase?.name ?? tPb("noComponent"),
            s.pcCase?.price ?? null,
            () => {
              setActive3D(null);
              setActiveModal("case");
            },
            !!s.pcCase
          )}
          {coreRow(
            "cooling",
            <Thermometer size={22} />,
            tPb("cooling"),
            s.cooling?.name ?? tPb("noComponent"),
            s.cooling?.price ?? null,
            () => {
              setActive3D(null);
              setActiveModal("cooling");
            },
            !!s.cooling
          )}

          <h2 className={styles.sectionTitle}>{tPb("accessoriesTitle")}</h2>
          {accRow("screen", <Monitor size={22} />, tPb("monitor"))}
          {accRow("desk", <Layout size={22} />, tPb("desk"))}
          {accRow("headphones", <Headphones size={22} />, tPb("headphones"))}
          {accRow("mouse", <Mouse size={22} />, tPb("mouse"))}
          {accRow("keyboard", <Keyboard size={22} />, tPb("keyboard"))}
          {accRow("chair", <Armchair size={22} />, tPb("chair"))}
        </div>
      </div>

      <div className={styles.summaryCol}>
        <h3 className={styles.summaryTitle}>{tPb("buildSummary")}</h3>
        <div className={styles.summaryRow}>
          <span>{tPb("componentsSelected")}</span>
          <span style={{ fontWeight: 800 }}>{partCount(s, acc)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>{tEng("performance")}</span>
          <span style={{ fontWeight: 700 }}>{perfLabel}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>{tPb("assemblyFee")}</span>
          <span style={{ color: "green", fontWeight: 700 }}>{tCart("free")}</span>
        </div>
        {warnings.length > 0 && (
          <div className={styles.summaryRow} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <span style={{ marginBottom: 6 }}>{tEng("warnings")}</span>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--red-600)" }}>
              {warnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles.summaryTotal}>
          <span>{tPb("total")}</span>
          <span>{formatMoney(totalPrice(s, acc))} IQD</span>
        </div>
        <button type="button" className={`btn-primary ${styles.checkoutBtn}`} disabled={partCount(s, acc) === 0} onClick={addToCart}>
          {tPb("addBuild")}
        </button>
      </div>

      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>{modalTitle()}</h3>
                <button type="button" className={styles.closeBtn} onClick={closeModal}>
                  <X size={24} />
                </button>
              </div>
              {renderModalBody()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
