import {
  emptySelections,
  filterMotherboards,
  filterRam,
  filterCases,
  filterCoolingForBuild,
  calculatePsuRecommendation,
  filterPsusByMinWattage,
  collectBuildWarnings,
  performanceIndicator,
  autoBuildFromBudget,
  MOTHERBOARD_CATALOG,
  RAM_CATALOG,
  STORAGE_CATALOG,
  PSU_CATALOG,
  CASE_CATALOG,
  COOLING_CATALOG,
  CPU_CATALOG,
  GPU_CATALOG,
} from "@/lib/pc-build";
import type { PcBuildSelections } from "@/lib/pc-build";

/**
 * POST /api/pc-build
 * Body:
 *  - { "action": "catalog" } — full static catalog (for headless clients)
 *  - { "action": "compatible", "selections": PcBuildSelections } — filtered lists + PSU + warnings
 *  - { "action": "auto", "budget": number, "useCase": "gaming" | "workstation" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body?.action === "catalog") {
      return Response.json({
        cpus: CPU_CATALOG,
        gpus: GPU_CATALOG,
        motherboards: MOTHERBOARD_CATALOG,
        ram: RAM_CATALOG,
        storage: STORAGE_CATALOG,
        psus: PSU_CATALOG,
        cases: CASE_CATALOG,
        cooling: COOLING_CATALOG,
      });
    }

    if (body?.action === "auto") {
      const budget = Number(body.budget);
      const useCase = body.useCase === "workstation" ? "workstation" : "gaming";
      if (!Number.isFinite(budget) || budget < 0) {
        return Response.json({ error: "Invalid budget" }, { status: 400 });
      }
      const build = autoBuildFromBudget(budget, useCase);
      return Response.json({ selections: build, warnings: collectBuildWarnings(build) });
    }

    if (body?.action === "compatible") {
      const s = { ...emptySelections(), ...body.selections } as PcBuildSelections;

      const motherboards =
        s.cpu != null ? filterMotherboards(MOTHERBOARD_CATALOG, s.cpu) : [];
      const ram =
        s.motherboard != null ? filterRam(s.motherboard, RAM_CATALOG) : [];
      const psuRec =
        s.cpu && s.gpu ? calculatePsuRecommendation(s.cpu, s.gpu) : null;
      const psus =
        psuRec != null
          ? filterPsusByMinWattage(PSU_CATALOG, psuRec.shelfWattage)
          : PSU_CATALOG;

      const cases =
        s.motherboard && s.gpu
          ? filterCases(CASE_CATALOG, s.motherboard, s.gpu)
          : CASE_CATALOG;

      const cooling =
        s.cpu && s.pcCase
          ? filterCoolingForBuild(COOLING_CATALOG, s.cpu, s.pcCase)
          : COOLING_CATALOG;

      return Response.json({
        filtered: {
          motherboards,
          ram,
          storage: STORAGE_CATALOG,
          psus,
          cases,
          cooling,
        },
        psuRecommendation: psuRec,
        warnings: collectBuildWarnings(s),
        performanceTier: performanceIndicator(s.cpu, s.gpu),
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
