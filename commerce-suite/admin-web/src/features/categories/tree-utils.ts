import type { CategoryFlat, CategoryTreeNode } from "./types";

export function buildTree(flat: CategoryFlat[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const c of flat) {
    nodes.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const c of flat) {
    const node = nodes.get(c.id)!;
    if (c.parentId && nodes.has(c.parentId)) {
      nodes.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortKids = (n: CategoryTreeNode) => {
    n.children.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
    n.children.forEach(sortKids);
  };
  roots.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  roots.forEach(sortKids);
  return roots;
}

export function collectDescendantIds(rootId: string, flat: CategoryFlat[]): Set<string> {
  const byParent = new Map<string | null, CategoryFlat[]>();
  for (const c of flat) {
    const p = c.parentId ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c);
  }
  const out = new Set<string>();
  const walk = (id: string) => {
    out.add(id);
    for (const ch of byParent.get(id) ?? []) walk(ch.id);
  };
  walk(rootId);
  return out;
}

export function flattenReorderPayload(flat: CategoryFlat[]) {
  return flat.map((c) => ({
    id: c.id,
    parentId: c.parentId ?? null,
    sortOrder: c.sortOrder,
  }));
}
