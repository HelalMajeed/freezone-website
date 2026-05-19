"use client";

import type { CSSProperties, ReactNode } from "react";
import type { FacetAttributeDef } from "@/lib/data";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";

type Props = {
  attributes: FacetAttributeDef[];
  specs: Record<string, string>;
  onChange: (key: string, value: string) => void;
  fieldStyle: CSSProperties;
  locale?: "en" | "ar";
};

function SpecFieldList({
  attributes,
  specs,
  onChange,
  fieldStyle,
  locale,
}: {
  attributes: FacetAttributeDef[];
  specs: Record<string, string>;
  onChange: (key: string, value: string) => void;
  fieldStyle: CSSProperties;
  locale: "en" | "ar";
}) {
  if (!attributes.length) return null;

  return (
    <>
      {attributes.map((attr) => {
        const label = facetAttributeDisplayName(attr, locale);
        const val = specs[attr.key] ?? "";
        const type = attr.type ?? "SELECT";

        if (type === "BOOLEAN") {
          const checked = val === "true" || val === "1" || val === "yes" || val === "نعم";
          return (
            <label key={attr.key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(attr.key, e.target.checked ? "true" : "false")}
              />
              <span>
                {label}{" "}
                <code style={{ fontSize: 11, opacity: 0.75 }}>{attr.key}</code>
                {attr.required ? " *" : ""}
              </span>
            </label>
          );
        }

        if ((type === "SELECT" || type === "COLOR") && attr.options?.length) {
          return (
            <label key={attr.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ color: "var(--admin-muted)" }}>
                {label} <code style={{ fontSize: 11, opacity: 0.8 }}>{attr.key}</code>
                {attr.required ? " *" : ""}
              </span>
              <select value={val} onChange={(e) => onChange(attr.key, e.target.value)} style={fieldStyle}>
                <option value="">—</option>
                {attr.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                    {attr.unit ? ` ${attr.unit}` : ""}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (type === "RANGE") {
          return (
            <label key={attr.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ color: "var(--admin-muted)" }}>
                {label} <code style={{ fontSize: 11, opacity: 0.8 }}>{attr.key}</code>
                {attr.unit ? ` (${attr.unit})` : ""}
                {attr.required ? " *" : ""}
              </span>
              <input
                type="number"
                value={val}
                onChange={(e) => onChange(attr.key, e.target.value)}
                placeholder={attr.unit ?? ""}
                style={fieldStyle}
              />
            </label>
          );
        }

        if (type === "MULTI_SELECT" && attr.options?.length) {
          const selected = new Set(
            val
              .split(/[,;|]/)
              .map((x) => x.trim())
              .filter(Boolean),
          );
          return (
            <fieldset key={attr.key} style={{ border: "none", margin: 0, padding: 0 }}>
              <legend style={{ fontSize: 13, color: "var(--admin-muted)", marginBottom: 6 }}>
                {label} <code style={{ fontSize: 11 }}>{attr.key}</code>
              </legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {attr.options.map((opt) => (
                  <label key={opt} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(opt)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(opt);
                        else next.delete(opt);
                        onChange(attr.key, [...next].join(", "));
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }

        return (
          <label key={attr.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            <span style={{ color: "var(--admin-muted)" }}>
              {label} <code style={{ fontSize: 11, opacity: 0.8 }}>{attr.key}</code>
              {attr.required ? " *" : ""}
            </span>
            <input
              value={val}
              onChange={(e) => onChange(attr.key, e.target.value)}
              placeholder={attr.unit ? `(${attr.unit})` : ""}
              style={fieldStyle}
            />
          </label>
        );
      })}
    </>
  );
}

function SpecSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <span style={{ color: "var(--admin-text, #e2e8f0)", fontSize: 14, fontWeight: 700 }}>{title}</span>
        <p style={{ margin: "4px 0 0", color: "var(--admin-muted)", fontSize: 12 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function AdminProductSpecFields({ attributes, specs, onChange, fieldStyle, locale = "ar" }: Props) {
  if (!attributes.length) return null;

  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attributes);

  const sectionStyle: CSSProperties = {
    padding: 14,
    borderRadius: 10,
    border: "1px solid var(--admin-border, #334155)",
    background: "var(--admin-surface-muted)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {filterableSpecs.length > 0 ? (
        <div style={sectionStyle}>
          <SpecSection
            title="مواصفات الفلاتر (Visible Filters)"
            subtitle="تظهر في شريط الفلاتر بصفحة القسم فقط"
          >
            <SpecFieldList
              attributes={filterableSpecs}
              specs={specs}
              onChange={onChange}
              fieldStyle={fieldStyle}
              locale={locale}
            />
          </SpecSection>
        </div>
      ) : null}

      {extendedSpecs.length > 0 ? (
        <div style={sectionStyle}>
          <SpecSection
            title="المواصفات التفصيلية (Extended Specs)"
            subtitle="تظهر في صفحة المنتج فقط — لا تظهر في شريط الفلاتر"
          >
            <SpecFieldList
              attributes={extendedSpecs}
              specs={specs}
              onChange={onChange}
              fieldStyle={fieldStyle}
              locale={locale}
            />
          </SpecSection>
        </div>
      ) : null}
    </div>
  );
}
