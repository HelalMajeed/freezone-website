"use client";

export {
  parseFacetKeysFromUnknown,
  facetAttributesToOrderedSelection,
  facetKeysToOrderedSelection,
  getFacetCatalogOrder,
} from "./facet/facet-keys-utils";
export { FacetKeysWorkspace } from "./facet/FacetKeysWorkspace";
export type { FacetKeysWorkspaceProps, FacetKeysEditorHandle, FacetImportCategoryOption } from "./facet/FacetKeysWorkspace";

import { forwardRef } from "react";
import { FacetKeysWorkspace, type FacetKeysWorkspaceProps, type FacetKeysEditorHandle } from "./facet/FacetKeysWorkspace";

/** Facet / attribute assignment for a category — card + chips layout with sticky summary (RTL-aware). */
export const FacetKeysPicker = forwardRef<FacetKeysEditorHandle, FacetKeysWorkspaceProps>(function FacetKeysPicker(props, ref) {
  return <FacetKeysWorkspace ref={ref} {...props} />;
});
