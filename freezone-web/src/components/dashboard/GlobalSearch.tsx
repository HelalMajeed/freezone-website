/**
 * Dashboard global search — topbar typeahead + Ctrl/Cmd+K command palette.
 *
 * Both surfaces query `GET /api/admin/search` (products / categories / brands /
 * team members) and deep-link into the matching dashboard page with a `?search=`
 * param that list pages can adopt. The palette additionally exposes the sidebar
 * pages as jump targets.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  CornerDownLeft,
  FileText,
  FolderTree,
  Loader2,
  Package,
  Search,
  SearchX,
  UserRound,
} from "lucide-react";
import { adminSearchApi, type AdminSearchResponse } from "@/lib/dashboard/api";
import { useDashboardLocale, type BilingualMessage, type DashboardLocale } from "@/lib/dashboard/i18n";
import s from "./topbar.module.css";

export type SearchPageLink = { to: string; label: BilingualMessage };

type SearchEntry = {
  key: string;
  group: "pages" | "products" | "categories" | "brands" | "users";
  label: string;
  sub?: string;
  to: string;
};

type SearchStatus = "idle" | "short" | "loading" | "done" | "error";

const GROUP_ICONS: Record<SearchEntry["group"], ReactNode> = {
  pages: <FileText size={15} aria-hidden />,
  products: <Package size={15} aria-hidden />,
  categories: <FolderTree size={15} aria-hidden />,
  brands: <Award size={15} aria-hidden />,
  users: <UserRound size={15} aria-hidden />,
};

const GROUP_LABEL_KEYS = {
  pages: "search.pages",
  products: "search.products",
  categories: "search.categories",
  brands: "search.brands",
  users: "search.users",
} as const;

function buildEntries(
  data: AdminSearchResponse,
  lang: "en" | "ar",
  limitPerGroup = 5,
): SearchEntry[] {
  const name = (en: string, ar: string) => (lang === "ar" ? ar || en : en || ar);
  const entries: SearchEntry[] = [];
  for (const p of data.products.slice(0, limitPerGroup)) {
    entries.push({
      key: `product-${p.id}`,
      group: "products",
      label: name(p.nameEn, p.nameAr),
      sub: p.sku || p.slug || `#${p.id}`,
      to: `/dashboard/products?search=${encodeURIComponent(p.sku || p.nameEn)}`,
    });
  }
  for (const c of data.categories.slice(0, limitPerGroup)) {
    entries.push({
      key: `category-${c.id}`,
      group: "categories",
      label: name(c.nameEn, c.nameAr),
      sub: c.slug,
      to: `/dashboard/categories?search=${encodeURIComponent(c.nameEn || c.slug)}`,
    });
  }
  for (const b of data.brands.slice(0, limitPerGroup)) {
    entries.push({
      key: `brand-${b.id}`,
      group: "brands",
      label: name(b.nameEn, b.nameAr),
      sub: b.slug,
      to: `/dashboard/brands?search=${encodeURIComponent(b.nameEn || b.slug)}`,
    });
  }
  for (const u of data.users.slice(0, limitPerGroup)) {
    entries.push({
      key: `user-${u.id}`,
      group: "users",
      label: u.name,
      sub: u.email,
      to: `/dashboard/users?search=${encodeURIComponent(u.email)}`,
    });
  }
  return entries;
}

/** Debounced admin-search state shared by the topbar dropdown and the palette. */
function useAdminSearch(query: string) {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [data, setData] = useState<AdminSearchResponse | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setStatus("idle");
      setData(null);
      return;
    }
    if (q.length < 2) {
      setStatus("short");
      setData(null);
      return;
    }
    setStatus("loading");
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      adminSearchApi
        .query(q, 8)
        .then((res) => {
          if (requestId.current !== id) return;
          setData(res);
          setStatus("done");
        })
        .catch(() => {
          if (requestId.current !== id) return;
          setData(null);
          setStatus("error");
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return { status, data };
}

function ResultsList({
  entries,
  status,
  query,
  activeIndex,
  onPick,
  onHover,
  locale,
}: {
  entries: SearchEntry[];
  status: SearchStatus;
  query: string;
  activeIndex: number;
  onPick: (entry: SearchEntry) => void;
  onHover: (index: number) => void;
  locale: DashboardLocale;
}) {
  const { t } = locale;
  if (status === "short" || status === "idle") {
    return <div className={s.searchStatus}>{t("search.minChars")}</div>;
  }
  if (status === "loading" && entries.length === 0) {
    return (
      <div className={s.searchStatus}>
        <Loader2 size={15} className={s.spinIcon} aria-hidden /> {t("search.searching")}
      </div>
    );
  }
  if (status === "error") {
    return <div className={s.searchStatus}>{t("search.error")}</div>;
  }
  if (entries.length === 0) {
    return (
      <div className={s.searchStatus}>
        <SearchX size={15} aria-hidden /> {t("search.noResults", { q: query.trim() })}
      </div>
    );
  }
  let lastGroup: SearchEntry["group"] | null = null;
  return (
    <>
      {entries.map((entry, index) => {
        const showGroup = entry.group !== lastGroup;
        lastGroup = entry.group;
        return (
          <div key={entry.key}>
            {showGroup && <div className={s.groupLabel}>{t(GROUP_LABEL_KEYS[entry.group])}</div>}
            <button
              type="button"
              className={[s.resultItem, index === activeIndex && s.resultItemActive]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onPick(entry)}
              onMouseEnter={() => onHover(index)}
            >
              <span className={s.resultIcon}>{GROUP_ICONS[entry.group]}</span>
              <span className={s.resultText}>
                <span className={s.resultLabel}>{entry.label}</span>
                {entry.sub && <span className={s.resultSub}>{entry.sub}</span>}
              </span>
              <CornerDownLeft size={13} className={s.resultEnter} aria-hidden />
            </button>
          </div>
        );
      })}
    </>
  );
}

/** Shared list-navigation keydown handler (ArrowUp/Down + Enter). */
function useListNavigation(
  entries: SearchEntry[],
  onPick: (entry: SearchEntry) => void,
) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [entries]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (entries.length ? (i + 1) % entries.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (entries.length ? (i - 1 + entries.length) % entries.length : 0));
      } else if (e.key === "Enter") {
        const entry = entries[activeIndex];
        if (entry) {
          e.preventDefault();
          onPick(entry);
        }
      }
    },
    [entries, activeIndex, onPick],
  );

  return { activeIndex, setActiveIndex, onKeyDown };
}

// ─── Topbar typeahead ────────────────────────────────────────────────────────

export function TopbarSearch() {
  const locale = useDashboardLocale();
  const { t, lang } = locale;
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { status, data } = useAdminSearch(query);

  const entries = useMemo(() => (data ? buildEntries(data, lang) : []), [data, lang]);

  const pick = useCallback(
    (entry: SearchEntry) => {
      setOpen(false);
      setQuery("");
      navigate(entry.to);
    },
    [navigate],
  );

  const { activeIndex, setActiveIndex, onKeyDown } = useListNavigation(entries, pick);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className={s.searchWrap} ref={wrapRef}>
      <span className={s.searchIcon}>
        <Search size={15} aria-hidden />
      </span>
      <input
        ref={inputRef}
        type="search"
        className={s.searchInput}
        placeholder={t("search.placeholder")}
        aria-label={t("search.aria")}
        value={query}
        role="combobox"
        aria-expanded={open}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
            return;
          }
          onKeyDown(e);
        }}
      />
      <span className={s.searchKbd} aria-hidden>
        {t("search.shortcutHint")}
      </span>
      {open && query.trim().length > 0 && (
        <div className={s.dropdown}>
          <ResultsList
            entries={entries}
            status={status}
            query={query}
            activeIndex={activeIndex}
            onPick={pick}
            onHover={setActiveIndex}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}

// ─── Command palette (Ctrl/Cmd+K) ────────────────────────────────────────────

export function CommandPalette({
  open,
  onClose,
  pages,
}: {
  open: boolean;
  onClose: () => void;
  /** Sidebar destinations offered as jump targets (already role-filtered). */
  pages: SearchPageLink[];
}) {
  const locale = useDashboardLocale();
  const { t, lang, pick: pickLabel } = locale;
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const { status, data } = useAdminSearch(query);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageEntries: SearchEntry[] = pages
      .filter(
        (p) =>
          !q ||
          p.label.en.toLowerCase().includes(q) ||
          p.label.ar.includes(query.trim()),
      )
      .map((p) => ({
        key: `page-${p.to}`,
        group: "pages" as const,
        label: pickLabel(p.label),
        sub: p.to,
        to: p.to,
      }));
    const apiEntries = data ? buildEntries(data, lang) : [];
    return [...pageEntries, ...apiEntries];
  }, [pages, query, data, lang, pickLabel]);

  const pick = useCallback(
    (entry: SearchEntry) => {
      onClose();
      setQuery("");
      navigate(entry.to);
    },
    [navigate, onClose],
  );

  const { activeIndex, setActiveIndex, onKeyDown } = useListNavigation(entries, pick);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={s.paletteBackdrop} onClick={onClose}>
      <div
        className={s.palette}
        role="dialog"
        aria-modal="true"
        aria-label={t("palette.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.paletteInputRow}>
          <Search size={17} aria-hidden />
          <input
            ref={inputRef}
            className={s.paletteInput}
            placeholder={t("palette.placeholder")}
            aria-label={t("palette.title")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {status === "loading" && <Loader2 size={15} className={s.spinIcon} aria-hidden />}
        </div>
        <div className={s.paletteResults}>
          {query.trim().length === 0 && entries.length > 0 ? (
            <>
              <div className={s.groupLabel}>{t("search.pages")}</div>
              {entries.map((entry, index) => (
                <button
                  key={entry.key}
                  type="button"
                  className={[s.resultItem, index === activeIndex && s.resultItemActive]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => pick(entry)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className={s.resultIcon}>{GROUP_ICONS[entry.group]}</span>
                  <span className={s.resultText}>
                    <span className={s.resultLabel}>{entry.label}</span>
                    {entry.sub && <span className={s.resultSub}>{entry.sub}</span>}
                  </span>
                  <CornerDownLeft size={13} className={s.resultEnter} aria-hidden />
                </button>
              ))}
            </>
          ) : (
            <ResultsList
              entries={entries}
              status={entries.length > 0 ? "done" : status}
              query={query}
              activeIndex={activeIndex}
              onPick={pick}
              onHover={setActiveIndex}
              locale={locale}
            />
          )}
        </div>
        <div className={s.paletteFooter}>
          <span className={s.paletteFooterHint}>
            <span className={s.kbd}>↑↓</span> {t("palette.navigate")}
          </span>
          <span className={s.paletteFooterHint}>
            <span className={s.kbd}>↵</span> {t("palette.select")}
          </span>
          <span className={s.paletteFooterHint}>
            <span className={s.kbd}>Esc</span> {t("palette.dismiss")}
          </span>
        </div>
      </div>
    </div>
  );
}
