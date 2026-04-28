import {
  Link as RouterLink,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
  type LinkProps as RouterLinkProps,
} from "react-router-dom";
import type { ReactNode } from "react";

export const locales = ["en", "ar"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

function useLocalePrefix(): (path: string) => string {
  const { locale } = useParams<{ locale: string }>();
  const lc = locale && locales.includes(locale as AppLocale) ? locale : defaultLocale;
  return (path: string) => {
    const p = path.startsWith("/") ? path : `/${path}`;
    if (p === "/" || p === "") return `/${lc}`;
    return `/${lc}${p}`;
  };
}

/** next-intl–style link: `to` is without locale prefix (e.g. `/products`). `prefetch` is ignored (compat). */
export function Link({
  to,
  href,
  prefetch: _prefetch,
  children,
  ...rest
}: Omit<RouterLinkProps, "to" | "prefetch"> & {
  to?: string;
  href?: string;
  prefetch?: boolean;
  children?: ReactNode;
}) {
  const prefix = useLocalePrefix();
  const dest = to ?? href ?? "/";
  return (
    <RouterLink to={prefix(dest)} {...rest}>
      {children}
    </RouterLink>
  );
}

export { NavLink };

/** Pathname without `/:locale` prefix — matches next-intl behavior. */
export function usePathname(): string {
  const { pathname } = useLocation();
  const { locale } = useParams<{ locale: string }>();
  if (!locale || !locales.includes(locale as AppLocale)) return pathname;
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || "/";
  return pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  const prefix = useLocalePrefix();
  return {
    push: (href: string) => navigate(prefix(href)),
    replace: (href: string) => navigate(prefix(href), { replace: true }),
    refresh: () => window.location.reload(),
    prefetch: (href: string) => {
      try {
        const url = prefix(href);
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);
      } catch {
        /* ignore */
      }
    },
  };
}

export function redirectToDefaultLocale() {
  return `/en`;
}
