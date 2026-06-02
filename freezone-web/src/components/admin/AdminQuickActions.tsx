"use client";

import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  DEFAULT_QUICK_ACTIONS,
  getQuickActionsOrder,
  setQuickActionsOrder,
  type QuickActionId,
} from "@/lib/admin/admin-user-prefs";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";

const ACTION_META: Record<QuickActionId, { label: string; href: string }> = {
  new_product: { label: "إضافة منتج", href: "/admin/products/new" },
  new_category: { label: "إضافة فئة", href: "/admin/categories" },
  import_csv: { label: "استيراد CSV", href: "/admin/import" },
  review: { label: "منتجات قيد المراجعة", href: "/admin/products?catalogStatus=PENDING_REVIEW" },
  reports: { label: "تقارير", href: "/admin" },
};

function SortableAction({ id }: { id: QuickActionId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const meta = ACTION_META[id];
  return (
    <Link
      ref={setNodeRef}
      to={meta.href}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid var(--fz-border)",
        background: "var(--fz-surface)",
        textDecoration: "none",
        color: "inherit",
        fontWeight: 600,
        fontSize: 13,
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {meta.label}
    </Link>
  );
}

export function AdminQuickActions() {
  const user = useDashboardAuth((s) => s.user);
  const [order, setOrder] = useState<QuickActionId[]>(() => getQuickActionsOrder(user?.id ?? null));
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as QuickActionId);
    const newIndex = order.indexOf(over.id as QuickActionId);
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    setQuickActionsOrder(user?.id ?? null, next);
  }

  return (
    <div dir="rtl" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: "var(--fz-text-muted)", marginBottom: 8 }}>إجراءات سريعة (اسحب لإعادة الترتيب)</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {order.map((id) => (
              <SortableAction key={id} id={id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
