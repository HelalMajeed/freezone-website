"use client";

import type { StoredNavColumn, StoredNavItem } from "@/lib/cms-types";
import { LucideIconSelect } from "@/components/admin/LucideIconSelect";
import { DEFAULT_STORED_NAV_EXAMPLE } from "@/lib/default-stored-nav";
import styles from "@/app/admin/(secure)/cms/cms.module.css";

function emptyColumn(): StoredNavColumn {
  return {
    titleEn: "Column",
    titleAr: "عمود",
    items: [{ labelEn: "Link", labelAr: "رابط", href: "/products" }],
  };
}

function emptyNavItem(n: number): StoredNavItem {
  return {
    id: `item-${Date.now()}-${n}`,
    labelEn: "Menu",
    labelAr: "قائمة",
    href: "/products",
    iconKey: "package",
    columns: [emptyColumn()],
  };
}

type Props = {
  items: StoredNavItem[];
  onChange: (next: StoredNavItem[]) => void;
  onLoadExample: () => void;
  onClearUseDefault: () => void;
};

export function NavItemsEditor({ items, onChange, onLoadExample, onClearUseDefault }: Props) {
  const setItem = (i: number, patch: Partial<StoredNavItem>) => {
    const next = [...items];
    const cur = next[i];
    if (!cur) return;
    next[i] = { ...cur, ...patch };
    onChange(next);
  };

  const setColumn = (itemIdx: number, colIdx: number, patch: Partial<StoredNavColumn>) => {
    const item = items[itemIdx];
    if (!item) return;
    const cols = [...item.columns];
    const c = cols[colIdx];
    if (!c) return;
    cols[colIdx] = { ...c, ...patch };
    setItem(itemIdx, { columns: cols });
  };

  const setLink = (itemIdx: number, colIdx: number, linkIdx: number, patch: Partial<{ labelEn: string; labelAr: string; href: string }>) => {
    const item = items[itemIdx];
    const col = item?.columns[colIdx];
    if (!col) return;
    const links = [...col.items];
    const L = links[linkIdx];
    if (!L) return;
    links[linkIdx] = { ...L, ...patch };
    setColumn(itemIdx, colIdx, { items: links });
  };

  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        حرّر عناصر القائمة العلوية والأعمدة والروابط. إذا حذفت كل شيء وتحفظ، يُستخدم التنسيق الافتراضي في الكود.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className={styles.btn} onClick={onLoadExample}>
          تحميل مثال
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => onChange([...items, emptyNavItem(items.length)])}>
          + عنصر قائمة رئيسي
        </button>
        <button type="button" className={styles.btnGhost} onClick={onClearUseDefault}>
          مسح الكل (الافتراضي من الكود)
        </button>
      </div>

      {items.map((item, i) => (
        <div key={item.id} className={styles.rowCard} style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <strong>عنصر {i + 1}</strong>
          <input placeholder="id (لاتيني)" dir="ltr" value={item.id} onChange={(e) => setItem(i, { id: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input placeholder="Label EN" value={item.labelEn} onChange={(e) => setItem(i, { labelEn: e.target.value })} />
            <input placeholder="Label AR" value={item.labelAr} onChange={(e) => setItem(i, { labelAr: e.target.value })} />
          </div>
          <input placeholder="href" dir="ltr" value={item.href} onChange={(e) => setItem(i, { href: e.target.value })} />
          <LucideIconSelect
            label="أيقونة القائمة"
            value={item.iconKey || "package"}
            onChange={(iconKey) => setItem(i, { iconKey: iconKey ?? "package" })}
          />

          {item.columns.map((col, ci) => (
            <div key={ci} style={{ border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>عمود {ci + 1}</span>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    const cols = item.columns.filter((_, j) => j !== ci);
                    setItem(i, { columns: cols.length ? cols : [emptyColumn()] });
                  }}
                >
                  حذف عمود
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input placeholder="Column title EN" value={col.titleEn} onChange={(e) => setColumn(i, ci, { titleEn: e.target.value })} />
                <input placeholder="Column title AR" value={col.titleAr} onChange={(e) => setColumn(i, ci, { titleAr: e.target.value })} />
              </div>
              <label className={styles.inline} style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(col.highlight)}
                  onChange={(e) => setColumn(i, ci, { highlight: e.target.checked })}
                />
                تمييز
              </label>
              <label className={styles.inline}>
                <input type="checkbox" checked={Boolean(col.cta)} onChange={(e) => setColumn(i, ci, { cta: e.target.checked })} />
                CTA
              </label>
              {col.items.map((link, li) => (
                <div key={li} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, marginTop: 6 }}>
                  <input placeholder="Link EN" value={link.labelEn} onChange={(e) => setLink(i, ci, li, { labelEn: e.target.value })} />
                  <input placeholder="Link AR" value={link.labelAr} onChange={(e) => setLink(i, ci, li, { labelAr: e.target.value })} />
                  <input placeholder="href" dir="ltr" value={link.href} onChange={(e) => setLink(i, ci, li, { href: e.target.value })} />
                  <button
                    type="button"
                    className={styles.btnGhost}
                    style={{ gridColumn: "1 / -1" }}
                    onClick={() => {
                      const links = col.items.filter((_, j) => j !== li);
                      setColumn(i, ci, { items: links.length ? links : [{ labelEn: "Link", labelAr: "رابط", href: "/products" }] });
                    }}
                  >
                    حذف رابط
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.btnGhost}
                style={{ marginTop: 8 }}
                onClick={() =>
                  setColumn(i, ci, {
                    items: [...col.items, { labelEn: "New", labelAr: "جديد", href: "/products" }],
                  })
                }
              >
                + رابط
              </button>
            </div>
          ))}

          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setItem(i, { columns: [...item.columns, emptyColumn()] })}
          >
            + عمود
          </button>

          <button type="button" className={styles.btnGhost} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            حذف عنصر القائمة
          </button>
        </div>
      ))}
    </div>
  );
}

export function loadExampleNav(): StoredNavItem[] {
  return JSON.parse(JSON.stringify(DEFAULT_STORED_NAV_EXAMPLE)) as StoredNavItem[];
}
