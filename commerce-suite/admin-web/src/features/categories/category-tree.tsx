"use client";

import {
  DndContext,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { CategoryFlat, CategoryTreeNode } from "./types";

type BranchProps = {
  nodes: CategoryTreeNode[];
  depth: number;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
};

function Row({
  node,
  expanded,
  onToggleExpand,
  selectedIds,
  toggleSelect,
  onEdit,
  children,
}: {
  node: CategoryTreeNode;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { parentId: node.parentId ?? null },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };
  const isOpen = expanded.has(node.id);
  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <div
        className={cn(
          "mb-1 flex items-center gap-2 rounded-md border border-border bg-white px-2 py-2 shadow-sm",
          selectedIds.has(node.id) && "ring-2 ring-primary/40",
        )}
      >
        <button type="button" className="touch-none text-muted hover:text-[#061c34]" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox
          checked={selectedIds.has(node.id)}
          onCheckedChange={() => toggleSelect(node.id)}
          aria-label="select row"
        />
        <button
          type="button"
          className="p-0.5 text-muted hover:text-[#061c34]"
          onClick={() => onToggleExpand(node.id)}
          disabled={node.children.length === 0}
        >
          {node.children.length ? (
            isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>
        <button
          type="button"
          className="flex-1 text-start text-sm font-medium text-[#061c34]"
          onClick={() => onEdit(node.id)}
        >
          {node.nameEn}
          <span className="ms-2 text-xs font-normal text-muted">/{node.slug}</span>
          {!node.active && (
            <span className="ms-2 rounded bg-[#ffdad6] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#93000a]">
              off
            </span>
          )}
        </button>
      </div>
      {children}
    </li>
  );
}

function Branch({ nodes, depth, expanded, onToggleExpand, selectedIds, toggleSelect, onEdit }: BranchProps) {
  const ids = nodes.map((n) => n.id);
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul className={cn("space-y-1", depth > 0 && "ms-6 border-s border-border/80 ps-3")}>
        {nodes.map((node) => (
          <Row
            key={node.id}
            node={node}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            onEdit={onEdit}
          >
            {node.children.length > 0 && expanded.has(node.id) ? (
              <Branch
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                onEdit={onEdit}
              />
            ) : null}
          </Row>
        ))}
      </ul>
    </SortableContext>
  );
}

export type CategoryTreeProps = {
  tree: CategoryTreeNode[];
  flat: CategoryFlat[];
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onReorder: (nextFlat: CategoryFlat[]) => void;
};

export function CategoryTree({
  tree,
  flat,
  expanded,
  setExpanded,
  selectedIds,
  toggleSelect,
  onEdit,
  onReorder,
}: CategoryTreeProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const collectSiblings = (parentId: string | null) =>
    flat
      .filter((c) => (c.parentId ?? null) === (parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const a = flat.find((c) => c.id === activeId);
    const o = flat.find((c) => c.id === overId);
    if (!a || !o) return;
    const pa = a.parentId ?? null;
    const po = o.parentId ?? null;
    if (pa !== po) return;
    const sibIds = collectSiblings(pa).map((c) => c.id);
    const oldIndex = sibIds.indexOf(activeId);
    const newIndex = sibIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const nextOrder = arrayMove(sibIds, oldIndex, newIndex);
    const nextFlat = flat.map((c) => {
      if ((c.parentId ?? null) !== pa) return c;
      const idx = nextOrder.indexOf(c.id);
      if (idx < 0) return c;
      return { ...c, sortOrder: idx };
    });
    onReorder(nextFlat);
  };

  const onToggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <Branch
        nodes={tree}
        depth={0}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        onEdit={onEdit}
      />
    </DndContext>
  );
}
